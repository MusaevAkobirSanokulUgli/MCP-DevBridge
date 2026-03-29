// ============================================================
// MCP DevBridge - Health Controller
// System health check endpoint
// ============================================================

using McpDevBridge.Api.Data;
using McpDevBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace McpDevBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly ILoggingService _logging;
    private readonly IServerManagerService _serverManager;
    private static readonly DateTime _startTime = DateTime.UtcNow;

    public HealthController(
        AppDbContext db,
        ILoggingService logging,
        IServerManagerService serverManager)
    {
        _db = db;
        _logging = logging;
        _serverManager = serverManager;
    }

    /// <summary>
    /// Get system health status including uptime, server counts, and error rates.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetHealth()
    {
        var servers = await _db.McpServers.ToListAsync();
        var activeServers = servers.Count(s => s.Status == "active");
        var totalServers = servers.Count;
        var recentErrors = await _logging.GetErrorCountAsync(TimeSpan.FromHours(1));
        var uptime = (DateTime.UtcNow - _startTime).TotalSeconds;

        string status;
        if (activeServers == totalServers && recentErrors == 0)
            status = "healthy";
        else if (activeServers > 0)
            status = "degraded";
        else
            status = "unhealthy";

        return Ok(new
        {
            status,
            uptime = Math.Round(uptime, 0),
            activeServers,
            totalServers,
            recentErrors,
            lastChecked = DateTime.UtcNow,
            version = "1.0.0"
        });
    }

    /// <summary>
    /// Get dashboard statistics.
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var servers = await _serverManager.GetAllServersAsync();
        var activeConnections = servers.Count(s => s.Status == "active");
        var totalToolCalls = await _logging.GetTotalInvocationCountAsync();
        var totalTools = await _db.Tools.CountAsync(t => t.Enabled);
        var recentErrors = await _logging.GetErrorCountAsync(TimeSpan.FromHours(24));
        var totalInvocations = Math.Max(totalToolCalls, 1);
        var errorRate = Math.Round((double)recentErrors / totalInvocations * 100, 2);

        var recentInvocations = await _logging.GetToolInvocationsAsync(null, 1, 10);

        return Ok(new
        {
            activeConnections,
            totalToolCalls,
            totalTools,
            errorRate,
            recentActivity = recentInvocations,
            serverStatuses = servers
        });
    }

    /// <summary>
    /// Trigger health check for all servers.
    /// </summary>
    [HttpPost("check")]
    public async Task<IActionResult> TriggerHealthCheck()
    {
        await _serverManager.PerformHealthChecksAsync();
        return Ok(new { message = "Health check completed", timestamp = DateTime.UtcNow });
    }
}
