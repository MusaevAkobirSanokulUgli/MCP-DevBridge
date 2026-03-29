// ============================================================
// MCP DevBridge - Server Manager Service
// Manages MCP server lifecycle, health checks, and tool sync
// ============================================================

using System.Text.Json;
using System.Text.Json.Nodes;
using McpDevBridge.Api.Data;
using McpDevBridge.Api.Hubs;
using McpDevBridge.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace McpDevBridge.Api.Services;

public interface IServerManagerService
{
    Task<List<McpServerResponseDto>> GetAllServersAsync();
    Task<McpServerResponseDto?> GetServerByIdAsync(string id);
    Task<McpServerResponseDto> CreateServerAsync(McpServerCreateDto dto);
    Task<McpServerResponseDto?> UpdateServerAsync(string id, McpServerUpdateDto dto);
    Task<bool> DeleteServerAsync(string id);
    Task<McpServerResponseDto?> StartServerAsync(string id);
    Task<McpServerResponseDto?> StopServerAsync(string id);
    Task RefreshServerToolsAsync(string id);
    Task PerformHealthChecksAsync();
}

public class ServerManagerService : IServerManagerService
{
    private readonly AppDbContext _db;
    private readonly IMcpProtocolService _protocol;
    private readonly ILoggingService _logging;
    private readonly IHubContext<DashboardHub> _hub;
    private readonly ILogger<ServerManagerService> _logger;

    public ServerManagerService(
        AppDbContext db,
        IMcpProtocolService protocol,
        ILoggingService logging,
        IHubContext<DashboardHub> hub,
        ILogger<ServerManagerService> logger)
    {
        _db = db;
        _protocol = protocol;
        _logging = logging;
        _hub = hub;
        _logger = logger;
    }

    public async Task<List<McpServerResponseDto>> GetAllServersAsync()
    {
        var servers = await _db.McpServers
            .Include(s => s.Tools)
            .OrderBy(s => s.Name)
            .ToListAsync();

        return servers.Select(MapToDto).ToList();
    }

    public async Task<McpServerResponseDto?> GetServerByIdAsync(string id)
    {
        var server = await _db.McpServers
            .Include(s => s.Tools)
            .FirstOrDefaultAsync(s => s.Id == id);

        return server != null ? MapToDto(server) : null;
    }

    public async Task<McpServerResponseDto> CreateServerAsync(McpServerCreateDto dto)
    {
        var server = new McpServer
        {
            Name = dto.Name,
            Type = dto.Type,
            Endpoint = dto.Endpoint,
            Description = dto.Description,
            Configuration = JsonSerializer.Serialize(dto.Configuration),
            Status = "inactive",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.McpServers.Add(server);
        await _db.SaveChangesAsync();

        await _logging.LogConnectionEventAsync(server.Id, "connected", $"Server '{server.Name}' registered");
        await NotifyDashboardAsync("server_created", server.Name);

        return MapToDto(server);
    }

    public async Task<McpServerResponseDto?> UpdateServerAsync(string id, McpServerUpdateDto dto)
    {
        var server = await _db.McpServers.Include(s => s.Tools).FirstOrDefaultAsync(s => s.Id == id);
        if (server == null) return null;

        if (!string.IsNullOrEmpty(dto.Name)) server.Name = dto.Name;
        if (!string.IsNullOrEmpty(dto.Endpoint)) server.Endpoint = dto.Endpoint;
        if (!string.IsNullOrEmpty(dto.Description)) server.Description = dto.Description;
        if (dto.Configuration != null) server.Configuration = JsonSerializer.Serialize(dto.Configuration);
        server.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await NotifyDashboardAsync("server_updated", server.Name);

        return MapToDto(server);
    }

    public async Task<bool> DeleteServerAsync(string id)
    {
        var server = await _db.McpServers.FindAsync(id);
        if (server == null) return false;

        var name = server.Name;
        _db.McpServers.Remove(server);
        await _db.SaveChangesAsync();

        await NotifyDashboardAsync("server_deleted", name);
        return true;
    }

    public async Task<McpServerResponseDto?> StartServerAsync(string id)
    {
        var server = await _db.McpServers.Include(s => s.Tools).FirstOrDefaultAsync(s => s.Id == id);
        if (server == null) return null;

        // Check health of the server
        var isHealthy = await _protocol.CheckHealthAsync(server.Endpoint);

        if (isHealthy)
        {
            server.Status = "active";
            server.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            await _logging.LogConnectionEventAsync(server.Id, "connected", $"Server '{server.Name}' is now active");
            await RefreshServerToolsAsync(id);
            await NotifyDashboardAsync("server_started", server.Name);
        }
        else
        {
            server.Status = "error";
            server.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();

            await _logging.LogConnectionEventAsync(server.Id, "error", $"Server '{server.Name}' failed health check at {server.Endpoint}");
            await NotifyDashboardAsync("server_error", server.Name);
        }

        return MapToDto(server);
    }

    public async Task<McpServerResponseDto?> StopServerAsync(string id)
    {
        var server = await _db.McpServers.Include(s => s.Tools).FirstOrDefaultAsync(s => s.Id == id);
        if (server == null) return null;

        server.Status = "inactive";
        server.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        await _logging.LogConnectionEventAsync(server.Id, "disconnected", $"Server '{server.Name}' stopped");
        await NotifyDashboardAsync("server_stopped", server.Name);

        return MapToDto(server);
    }

    public async Task RefreshServerToolsAsync(string id)
    {
        var server = await _db.McpServers.Include(s => s.Tools).FirstOrDefaultAsync(s => s.Id == id);
        if (server == null) return;

        try
        {
            var tools = await _protocol.ListToolsAsync(server.Endpoint);
            if (tools == null) return;

            // Remove existing tools that are no longer available
            var existingToolNames = server.Tools.Select(t => t.Name).ToHashSet();
            var remoteToolNames = new HashSet<string>();

            foreach (var toolNode in tools)
            {
                if (toolNode == null) continue;
                var toolObj = toolNode.AsObject();
                var name = toolObj["name"]?.GetValue<string>() ?? "";
                if (string.IsNullOrEmpty(name)) continue;

                remoteToolNames.Add(name);

                var existing = server.Tools.FirstOrDefault(t => t.Name == name);
                if (existing != null)
                {
                    existing.Description = toolObj["description"]?.GetValue<string>() ?? existing.Description;
                    existing.InputSchema = toolObj["inputSchema"]?.ToJsonString() ?? existing.InputSchema;
                }
                else
                {
                    _db.Tools.Add(new Tool
                    {
                        ServerId = server.Id,
                        Name = name,
                        Description = toolObj["description"]?.GetValue<string>() ?? "",
                        InputSchema = toolObj["inputSchema"]?.ToJsonString() ?? "{}",
                        Enabled = true,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            // Mark tools no longer available
            foreach (var tool in server.Tools.Where(t => !remoteToolNames.Contains(t.Name)))
            {
                tool.Enabled = false;
            }

            await _db.SaveChangesAsync();
            _logger.LogInformation("Refreshed tools for server {ServerId}: {Count} tools", id, remoteToolNames.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh tools for server {ServerId}", id);
        }
    }

    public async Task PerformHealthChecksAsync()
    {
        var servers = await _db.McpServers.ToListAsync();
        foreach (var server in servers)
        {
            if (server.Status == "inactive") continue;

            var isHealthy = await _protocol.CheckHealthAsync(server.Endpoint);
            var previousStatus = server.Status;

            server.Status = isHealthy ? "active" : "error";
            server.UpdatedAt = DateTime.UtcNow;

            if (previousStatus != server.Status)
            {
                var eventType = isHealthy ? "connected" : "error";
                var message = isHealthy
                    ? $"Server '{server.Name}' recovered"
                    : $"Server '{server.Name}' health check failed";
                await _logging.LogConnectionEventAsync(server.Id, eventType, message);
                await NotifyDashboardAsync($"server_{(isHealthy ? "recovered" : "error")}", server.Name);
            }
        }

        await _db.SaveChangesAsync();
    }

    private static McpServerResponseDto MapToDto(McpServer server)
    {
        Dictionary<string, string> config;
        try
        {
            config = JsonSerializer.Deserialize<Dictionary<string, string>>(server.Configuration) ?? new();
        }
        catch
        {
            config = new Dictionary<string, string>();
        }

        return new McpServerResponseDto
        {
            Id = server.Id,
            Name = server.Name,
            Type = server.Type,
            Endpoint = server.Endpoint,
            Status = server.Status,
            Description = server.Description,
            Configuration = config,
            ToolCount = server.Tools?.Count ?? 0,
            CreatedAt = server.CreatedAt,
            UpdatedAt = server.UpdatedAt
        };
    }

    private async Task NotifyDashboardAsync(string eventType, string serverName)
    {
        try
        {
            await _hub.Clients.All.SendAsync("ServerEvent", new
            {
                Type = eventType,
                ServerName = serverName,
                Timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send SignalR notification");
        }
    }
}
