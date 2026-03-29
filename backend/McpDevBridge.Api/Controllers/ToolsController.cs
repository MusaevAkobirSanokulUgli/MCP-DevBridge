// ============================================================
// MCP DevBridge - Tools Controller
// Tool registry and invocation endpoints
// ============================================================

using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Nodes;
using McpDevBridge.Api.Data;
using McpDevBridge.Api.Models;
using McpDevBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace McpDevBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ToolsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IMcpProtocolService _protocol;
    private readonly ILoggingService _logging;
    private readonly ILogger<ToolsController> _logger;

    public ToolsController(
        AppDbContext db,
        IMcpProtocolService protocol,
        ILoggingService logging,
        ILogger<ToolsController> logger)
    {
        _db = db;
        _protocol = protocol;
        _logging = logging;
        _logger = logger;
    }

    /// <summary>
    /// List all registered tools across all servers.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<ToolResponseDto>>> GetAll([FromQuery] string? serverId, [FromQuery] string? serverType)
    {
        var query = _db.Tools
            .Include(t => t.Server)
            .Where(t => t.Enabled)
            .AsQueryable();

        if (!string.IsNullOrEmpty(serverId))
            query = query.Where(t => t.ServerId == serverId);

        if (!string.IsNullOrEmpty(serverType))
            query = query.Where(t => t.Server != null && t.Server.Type == serverType);

        var tools = await query.OrderBy(t => t.Server!.Name).ThenBy(t => t.Name).ToListAsync();

        var dtos = tools.Select(t =>
        {
            object schema;
            try { schema = JsonSerializer.Deserialize<object>(t.InputSchema) ?? new { }; }
            catch { schema = new { }; }

            return new ToolResponseDto
            {
                Id = t.Id,
                ServerId = t.ServerId,
                ServerName = t.Server?.Name ?? "Unknown",
                ServerType = t.Server?.Type ?? "Unknown",
                Name = t.Name,
                Description = t.Description,
                InputSchema = schema,
                Enabled = t.Enabled,
                CreatedAt = t.CreatedAt
            };
        }).ToList();

        return Ok(dtos);
    }

    /// <summary>
    /// Get a specific tool by ID.
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<ToolResponseDto>> GetById(string id)
    {
        var tool = await _db.Tools.Include(t => t.Server).FirstOrDefaultAsync(t => t.Id == id);
        if (tool == null) return NotFound(new { message = $"Tool '{id}' not found" });

        object schema;
        try { schema = JsonSerializer.Deserialize<object>(tool.InputSchema) ?? new { }; }
        catch { schema = new { }; }

        return Ok(new ToolResponseDto
        {
            Id = tool.Id,
            ServerId = tool.ServerId,
            ServerName = tool.Server?.Name ?? "Unknown",
            ServerType = tool.Server?.Type ?? "Unknown",
            Name = tool.Name,
            Description = tool.Description,
            InputSchema = schema,
            Enabled = tool.Enabled,
            CreatedAt = tool.CreatedAt
        });
    }

    /// <summary>
    /// Invoke a tool on an MCP server.
    /// </summary>
    [HttpPost("invoke")]
    public async Task<ActionResult<ToolInvokeResponseDto>> Invoke([FromBody] ToolInvokeDto dto)
    {
        if (!ModelState.IsValid) return BadRequest(ModelState);

        // Find the server
        var server = await _db.McpServers.FindAsync(dto.ServerId);
        if (server == null)
            return NotFound(new { message = $"Server '{dto.ServerId}' not found" });

        if (server.Status != "active")
            return BadRequest(new { message = $"Server '{server.Name}' is not active (status: {server.Status})" });

        // Log the invocation start
        var invocation = await _logging.LogToolInvocationAsync(server.Id, dto.ToolName, dto.Arguments);

        var stopwatch = Stopwatch.StartNew();
        try
        {
            // Build arguments as JsonObject
            var argsJson = new JsonObject();
            foreach (var kvp in dto.Arguments)
            {
                argsJson[kvp.Key] = JsonNode.Parse(JsonSerializer.Serialize(kvp.Value));
            }

            // Call the tool via MCP protocol
            var result = await _protocol.CallToolAsync(server.Endpoint, dto.ToolName, argsJson);
            stopwatch.Stop();

            var isError = result?["isError"]?.GetValue<bool>() ?? false;
            var status = isError ? "error" : "success";

            await _logging.CompleteToolInvocationAsync(invocation.Id, result ?? new JsonObject(), status, stopwatch.ElapsedMilliseconds);

            _logger.LogInformation("Tool invocation: {Server}/{Tool} ({Status}, {Duration}ms)",
                server.Name, dto.ToolName, status, stopwatch.ElapsedMilliseconds);

            return Ok(new ToolInvokeResponseDto
            {
                InvocationId = invocation.Id,
                ServerId = server.Id,
                ToolName = dto.ToolName,
                Result = result,
                IsError = isError,
                DurationMs = stopwatch.ElapsedMilliseconds,
                Timestamp = DateTime.UtcNow
            });
        }
        catch (McpProtocolException ex)
        {
            stopwatch.Stop();
            await _logging.CompleteToolInvocationAsync(invocation.Id, new { error = ex.Message }, "error", stopwatch.ElapsedMilliseconds);

            _logger.LogError(ex, "MCP protocol error invoking {Server}/{Tool}", server.Name, dto.ToolName);
            return StatusCode(502, new ToolInvokeResponseDto
            {
                InvocationId = invocation.Id,
                ServerId = server.Id,
                ToolName = dto.ToolName,
                Result = new { error = ex.Message, code = ex.Code },
                IsError = true,
                DurationMs = stopwatch.ElapsedMilliseconds,
                Timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            await _logging.CompleteToolInvocationAsync(invocation.Id, new { error = ex.Message }, "error", stopwatch.ElapsedMilliseconds);

            _logger.LogError(ex, "Error invoking tool {Server}/{Tool}", server.Name, dto.ToolName);
            return StatusCode(500, new ToolInvokeResponseDto
            {
                InvocationId = invocation.Id,
                ServerId = server.Id,
                ToolName = dto.ToolName,
                Result = new { error = ex.Message },
                IsError = true,
                DurationMs = stopwatch.ElapsedMilliseconds,
                Timestamp = DateTime.UtcNow
            });
        }
    }

    /// <summary>
    /// Get tool invocation history.
    /// </summary>
    [HttpGet("invocations")]
    public async Task<ActionResult<List<ToolInvocationResponseDto>>> GetInvocations(
        [FromQuery] string? serverId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var invocations = await _logging.GetToolInvocationsAsync(serverId, page, pageSize);
        return Ok(invocations);
    }
}
