// ============================================================
// MCP DevBridge - Tool Entity Model
// Represents a tool registered within an MCP server
// ============================================================

using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace McpDevBridge.Api.Models;

public class Tool
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public string Id { get; set; } = Guid.NewGuid().ToString();

    [Required]
    public string ServerId { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// JSON-serialized input schema for the tool
    /// </summary>
    public string InputSchema { get; set; } = "{}";

    public bool Enabled { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("ServerId")]
    public McpServer? Server { get; set; }

    public ICollection<ToolInvocation> Invocations { get; set; } = new List<ToolInvocation>();
}

// --- DTOs ---

public class ToolResponseDto
{
    public string Id { get; set; } = string.Empty;
    public string ServerId { get; set; } = string.Empty;
    public string ServerName { get; set; } = string.Empty;
    public string ServerType { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public object InputSchema { get; set; } = new { };
    public bool Enabled { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ToolInvokeDto
{
    [Required]
    public string ServerId { get; set; } = string.Empty;

    [Required]
    public string ToolName { get; set; } = string.Empty;

    public Dictionary<string, object> Arguments { get; set; } = new();
}

public class ToolInvokeResponseDto
{
    public string InvocationId { get; set; } = string.Empty;
    public string ServerId { get; set; } = string.Empty;
    public string ToolName { get; set; } = string.Empty;
    public object? Result { get; set; }
    public bool IsError { get; set; }
    public long DurationMs { get; set; }
    public DateTime Timestamp { get; set; }
}
