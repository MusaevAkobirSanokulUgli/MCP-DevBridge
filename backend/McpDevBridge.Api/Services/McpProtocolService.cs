// ============================================================
// MCP DevBridge - MCP Protocol Service
// Handles JSON-RPC 2.0 communication with MCP servers
// ============================================================

using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace McpDevBridge.Api.Services;

public interface IMcpProtocolService
{
    Task<JsonObject?> SendRpcRequestAsync(string endpoint, string method, JsonObject? parameters = null);
    Task<JsonObject?> GetServerInfoAsync(string endpoint);
    Task<JsonArray?> ListToolsAsync(string endpoint);
    Task<JsonObject?> CallToolAsync(string endpoint, string toolName, JsonObject arguments);
    Task<bool> CheckHealthAsync(string endpoint);
}

public class McpProtocolService : IMcpProtocolService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<McpProtocolService> _logger;
    private int _requestId;

    public McpProtocolService(HttpClient httpClient, ILogger<McpProtocolService> logger)
    {
        _httpClient = httpClient;
        _httpClient.Timeout = TimeSpan.FromSeconds(30);
        _logger = logger;
    }

    /// <summary>
    /// Send a JSON-RPC 2.0 request to an MCP server endpoint.
    /// </summary>
    public async Task<JsonObject?> SendRpcRequestAsync(string endpoint, string method, JsonObject? parameters = null)
    {
        var requestId = Interlocked.Increment(ref _requestId);

        var rpcRequest = new JsonObject
        {
            ["jsonrpc"] = "2.0",
            ["id"] = requestId,
            ["method"] = method,
        };

        if (parameters != null)
        {
            rpcRequest["params"] = parameters.DeepClone();
        }

        var json = rpcRequest.ToJsonString();
        _logger.LogDebug("MCP RPC Request to {Endpoint}: {Method} (id={Id})", endpoint, method, requestId);

        try
        {
            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync($"{endpoint}/rpc", content);

            response.EnsureSuccessStatusCode();

            var responseBody = await response.Content.ReadAsStringAsync();
            var responseJson = JsonNode.Parse(responseBody)?.AsObject();

            if (responseJson == null)
            {
                _logger.LogWarning("Received null response from {Endpoint} for method {Method}", endpoint, method);
                return null;
            }

            // Check for JSON-RPC error
            if (responseJson.ContainsKey("error") && responseJson["error"] != null)
            {
                var error = responseJson["error"]!.AsObject();
                var errorMsg = error["message"]?.GetValue<string>() ?? "Unknown error";
                _logger.LogWarning("MCP RPC Error from {Endpoint}: {Error}", endpoint, errorMsg);
                throw new McpProtocolException(errorMsg, error["code"]?.GetValue<int>() ?? -1);
            }

            return responseJson["result"]?.AsObject();
        }
        catch (McpProtocolException)
        {
            throw;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "HTTP error communicating with MCP server at {Endpoint}", endpoint);
            throw new McpProtocolException($"Failed to connect to MCP server at {endpoint}: {ex.Message}", -32000);
        }
        catch (TaskCanceledException ex)
        {
            _logger.LogError(ex, "Timeout communicating with MCP server at {Endpoint}", endpoint);
            throw new McpProtocolException($"Timeout connecting to MCP server at {endpoint}", -32001);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error communicating with MCP server at {Endpoint}", endpoint);
            throw new McpProtocolException($"Unexpected error: {ex.Message}", -32603);
        }
    }

    /// <summary>
    /// Get server capabilities and info via the initialize method.
    /// </summary>
    public async Task<JsonObject?> GetServerInfoAsync(string endpoint)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{endpoint}/info");
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadAsStringAsync();
            return JsonNode.Parse(body)?.AsObject();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get server info from {Endpoint}", endpoint);
            return null;
        }
    }

    /// <summary>
    /// List available tools from an MCP server.
    /// </summary>
    public async Task<JsonArray?> ListToolsAsync(string endpoint)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{endpoint}/tools");
            response.EnsureSuccessStatusCode();
            var body = await response.Content.ReadAsStringAsync();
            return JsonNode.Parse(body)?.AsArray();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list tools from {Endpoint}", endpoint);
            return null;
        }
    }

    /// <summary>
    /// Call a tool on an MCP server via the JSON-RPC protocol.
    /// </summary>
    public async Task<JsonObject?> CallToolAsync(string endpoint, string toolName, JsonObject arguments)
    {
        var parameters = new JsonObject
        {
            ["name"] = toolName,
            ["arguments"] = arguments.DeepClone()
        };

        return await SendRpcRequestAsync(endpoint, "tools/call", parameters);
    }

    /// <summary>
    /// Check if an MCP server is healthy and reachable.
    /// </summary>
    public async Task<bool> CheckHealthAsync(string endpoint)
    {
        try
        {
            var response = await _httpClient.GetAsync($"{endpoint}/health");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}

public class McpProtocolException : Exception
{
    public int Code { get; }

    public McpProtocolException(string message, int code) : base(message)
    {
        Code = code;
    }
}
