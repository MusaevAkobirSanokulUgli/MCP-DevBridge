// ============================================================
// MCP DevBridge - ToolInvocation Entity Model
// Represents a single invocation of an MCP tool
// ============================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace McpDevBridge.Api.Models;

public class ToolInvocation
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string ServerId { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string ToolName { get; set; } = string.Empty;

    /// <summary>
    /// JSON-serialized input arguments
    /// </summary>
    public string Input { get; set; } = "{}";

    /// <summary>
    /// JSON-serialized output result
    /// </summary>
    public string Output { get; set; } = "{}";

    [MaxLength(20)]
    public string Status { get; set; } = "pending"; // "success", "error", "pending"

    /// <summary>
    /// Duration in milliseconds
    /// </summary>
    public long DurationMs { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("ServerId")]
    public McpServer? Server { get; set; }
}

// --- DTOs ---

public class ToolInvocationResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string ServerId { get; set; } = string.Empty;
    public string ServerName { get; set; } = string.Empty;
    public string ToolName { get; set; } = string.Empty;
    public object Input { get; set; } = new { };
    public object Output { get; set; } = new { };
    public string Status { get; set; } = string.Empty;
    public long DurationMs { get; set; }
    public DateTime Timestamp { get; set; }
}
