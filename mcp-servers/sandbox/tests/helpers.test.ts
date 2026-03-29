import { formatDate, generateId, truncate, deepClone } from "../src/utils/helpers";

describe("formatDate", () => {
  it("should format a date correctly", () => {
    const date = new Date("2024-01-15");
    const result = formatDate(date);
    expect(result).toContain("January");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });
});

describe("generateId", () => {
  it("should generate an ID of the specified length", () => {
    const id = generateId(12);
    expect(id).toHaveLength(12);
  });

  it("should generate unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe("truncate", () => {
  it("should truncate long strings", () => {
    const result = truncate("Hello, World!", 8);
    expect(result).toBe("Hello...");
  });

  it("should not truncate short strings", () => {
    const result = truncate("Hi", 10);
    expect(result).toBe("Hi");
  });
});

describe("deepClone", () => {
  it("should create a deep copy", () => {
    const obj = { a: 1, b: { c: 2 } };
    const clone = deepClone(obj);
    clone.b.c = 99;
    expect(obj.b.c).toBe(2);
  });
});
