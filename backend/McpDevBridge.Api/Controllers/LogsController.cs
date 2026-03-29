// ============================================================
// MCP DevBridge - Logs Controller
// Activity and connection log querying endpoints
// ============================================================

using McpDevBridge.Api.Models;
using McpDevBridge.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace McpDevBridge.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LogsController : ControllerBase
{
    private readonly ILoggingService _logging;

    public LogsController(ILoggingService logging)
    {
        _logging = logging;
    }

    /// <summary>
    /// Query connection logs with optional filtering.
    /// </summary>
    [HttpGet("connections")]
    public async Task<ActionResult<List<ConnectionLogResponseDto>>> GetConnectionLogs(
        [FromQuery] string? serverId,
        [FromQuery] string? eventType,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var query = new LogQueryParams
        {
            ServerId = serverId,
            Event = eventType,
            From = from,
            To = to,
            Page = Math.Max(1, page),
            PageSize = Math.Clamp(pageSize, 1, 200)
        };

        var logs = await _logging.GetConnectionLogsAsync(query);
        return Ok(logs);
    }

    /// <summary>
    /// Query tool invocation logs with optional filtering.
    /// </summary>
    [HttpGet("invocations")]
    public async Task<ActionResult<List<ToolInvocationResponseDto>>> GetInvocationLogs(
        [FromQuery] string? serverId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var invocations = await _logging.GetToolInvocationsAsync(
            serverId,
            Math.Max(1, page),
            Math.Clamp(pageSize, 1, 200)
        );
        return Ok(invocations);
    }

    /// <summary>
    /// Get summary statistics for logs.
    /// </summary>
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var totalInvocations = await _logging.GetTotalInvocationCountAsync();
        var errorsLastHour = await _logging.GetErrorCountAsync(TimeSpan.FromHours(1));
        var errorsLast24h = await _logging.GetErrorCountAsync(TimeSpan.FromHours(24));

        return Ok(new
        {
            totalInvocations,
            errorsLastHour,
            errorsLast24Hours = errorsLast24h,
            timestamp = DateTime.UtcNow
        });
    }
}
