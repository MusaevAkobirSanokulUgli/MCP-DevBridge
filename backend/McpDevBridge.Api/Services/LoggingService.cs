// ============================================================
// MCP DevBridge - Logging Service
// Manages connection logs and tool invocation records
// ============================================================

using System.Text.Json;
using McpDevBridge.Api.Data;
using McpDevBridge.Api.Hubs;
using McpDevBridge.Api.Models;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace McpDevBridge.Api.Services;

public interface ILoggingService
{
    Task LogConnectionEventAsync(string serverId, string eventType, string message, string? details = null);
    Task<ToolInvocation> LogToolInvocationAsync(string serverId, string toolName, object input);
    Task CompleteToolInvocationAsync(string invocationId, object output, string status, long durationMs);
    Task<List<ConnectionLogResponseDto>> GetConnectionLogsAsync(LogQueryParams query);
    Task<List<ToolInvocationResponseDto>> GetToolInvocationsAsync(string? serverId, int page, int pageSize);
    Task<int> GetTotalInvocationCountAsync();
    Task<int> GetErrorCountAsync(TimeSpan period);
}

public class LoggingService : ILoggingService
{
    private readonly AppDbContext _db;
    private readonly IHubContext<DashboardHub> _hub;
    private readonly ILogger<LoggingService> _logger;

    public LoggingService(
        AppDbContext db,
        IHubContext<DashboardHub> hub,
        ILogger<LoggingService> logger)
    {
        _db = db;
        _hub = hub;
        _logger = logger;
    }

    public async Task LogConnectionEventAsync(string serverId, string eventType, string message, string? details = null)
    {
        var log = new ConnectionLog
        {
            ServerId = serverId,
            Event = eventType,
            Message = message,
            Details = details,
            Timestamp = DateTime.UtcNow
        };

        _db.ConnectionLogs.Add(log);
        await _db.SaveChangesAsync();

        // Send real-time notification
        try
        {
            var server = await _db.McpServers.FindAsync(serverId);
            await _hub.Clients.All.SendAsync("ConnectionEvent", new
            {
                log.Id,
                log.ServerId,
                ServerName = server?.Name ?? "Unknown",
                log.Event,
                log.Message,
                log.Details,
                log.Timestamp
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send SignalR connection event");
        }
    }

    public async Task<ToolInvocation> LogToolInvocationAsync(string serverId, string toolName, object input)
    {
        var invocation = new ToolInvocation
        {
            ServerId = serverId,
            ToolName = toolName,
            Input = JsonSerializer.Serialize(input),
            Status = "pending",
            Timestamp = DateTime.UtcNow
        };

        _db.ToolInvocations.Add(invocation);
        await _db.SaveChangesAsync();

        return invocation;
    }

    public async Task CompleteToolInvocationAsync(string invocationId, object output, string status, long durationMs)
    {
        var invocation = await _db.ToolInvocations.FindAsync(invocationId);
        if (invocation == null) return;

        invocation.Output = JsonSerializer.Serialize(output);
        invocation.Status = status;
        invocation.DurationMs = durationMs;

        await _db.SaveChangesAsync();

        // Log the tool call as a connection event too
        await LogConnectionEventAsync(
            invocation.ServerId,
            "tool_call",
            $"Tool invocation: {invocation.ToolName} ({status}, {durationMs}ms)",
            JsonSerializer.Serialize(new { invocationId, durationMs, status })
        );

        // Send real-time notification
        try
        {
            var server = await _db.McpServers.FindAsync(invocation.ServerId);
            await _hub.Clients.All.SendAsync("ToolInvocationComplete", new
            {
                invocation.Id,
                invocation.ServerId,
                ServerName = server?.Name ?? "Unknown",
                invocation.ToolName,
                invocation.Status,
                invocation.DurationMs,
                invocation.Timestamp
            });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send SignalR invocation event");
        }
    }

    public async Task<List<ConnectionLogResponseDto>> GetConnectionLogsAsync(LogQueryParams query)
    {
        var q = _db.ConnectionLogs
            .Include(l => l.Server)
            .AsQueryable();

        if (!string.IsNullOrEmpty(query.ServerId))
            q = q.Where(l => l.ServerId == query.ServerId);

        if (!string.IsNullOrEmpty(query.Event))
            q = q.Where(l => l.Event == query.Event);

        if (query.From.HasValue)
            q = q.Where(l => l.Timestamp >= query.From.Value);

        if (query.To.HasValue)
            q = q.Where(l => l.Timestamp <= query.To.Value);

        var logs = await q
            .OrderByDescending(l => l.Timestamp)
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync();

        return logs.Select(l => new ConnectionLogResponseDto
        {
            Id = l.Id,
            ServerId = l.ServerId,
            ServerName = l.Server?.Name ?? "Unknown",
            Event = l.Event,
            Message = l.Message,
            Details = l.Details,
            Timestamp = l.Timestamp
        }).ToList();
    }

    public async Task<List<ToolInvocationResponseDto>> GetToolInvocationsAsync(string? serverId, int page, int pageSize)
    {
        var q = _db.ToolInvocations
            .Include(i => i.Server)
            .AsQueryable();

        if (!string.IsNullOrEmpty(serverId))
            q = q.Where(i => i.ServerId == serverId);

        var invocations = await q
            .OrderByDescending(i => i.Timestamp)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return invocations.Select(i =>
        {
            object input, output;
            try { input = JsonSerializer.Deserialize<object>(i.Input) ?? new { }; } catch { input = i.Input; }
            try { output = JsonSerializer.Deserialize<object>(i.Output) ?? new { }; } catch { output = i.Output; }

            return new ToolInvocationResponseDto
            {
                Id = i.Id,
                ServerId = i.ServerId,
                ServerName = i.Server?.Name ?? "Unknown",
                ToolName = i.ToolName,
                Input = input,
                Output = output,
                Status = i.Status,
                DurationMs = i.DurationMs,
                Timestamp = i.Timestamp
            };
        }).ToList();
    }

    public async Task<int> GetTotalInvocationCountAsync()
    {
        return await _db.ToolInvocations.CountAsync();
    }

    public async Task<int> GetErrorCountAsync(TimeSpan period)
    {
        var since = DateTime.UtcNow - period;
        return await _db.ToolInvocations
            .Where(i => i.Status == "error" && i.Timestamp >= since)
            .CountAsync();
    }
}
