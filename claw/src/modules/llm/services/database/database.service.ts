// src/services/database.service.ts
import { Database } from "bun:sqlite";

export class DatabaseService {
  db: Database;

  constructor(dbPath: string = "agent.db") {
    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize() {
    // Existing requests table (unchanged)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_input TEXT NOT NULL,
        plan TEXT,
        response TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 🔥 NEW: executions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS executions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        step_index INTEGER NOT NULL,
        tool_name TEXT NOT NULL,
        arguments_json TEXT,
        result_json TEXT,
        duration_ms INTEGER,
        error TEXT,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (request_id) REFERENCES requests(id)
      );
    `);
  }

  // ✅ Now returns request ID
  saveRequest(userInput: string, plan: any, response: string) {
    const stmt = this.db.prepare(`
      INSERT INTO requests (user_input, plan, response)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(
      userInput,
      plan ? JSON.stringify(plan) : null,
      response
    );

    return result.lastInsertRowid as number;
  }

  // ✅ Update response later
  updateResponse(requestId: number, response: string) {
    const stmt = this.db.prepare(`
      UPDATE requests
      SET response = ?
      WHERE id = ?
    `);

    stmt.run(response, requestId);
  }

  // ✅ Save each execution step
  saveExecution(data: {
    requestId: number;
    stepIndex: number;
    tool: string;
    args?: any;
    result?: any;
    durationMs?: number;
    error?: string;
  }) {
    const stmt = this.db.prepare(`
      INSERT INTO executions (
        request_id,
        step_index,
        tool_name,
        arguments_json,
        result_json,
        duration_ms,
        error
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const res = stmt.run(
      data.requestId,
      data.stepIndex,
      data.tool,
      data.args ? JSON.stringify(data.args) : null,
      data.result ? JSON.stringify(data.result) : null,
      data.durationMs ?? null,
      data.error ?? null
    );

    return res.lastInsertRowid as number;
  }

  getAllRequests() {
    const stmt = this.db.prepare(
      `SELECT * FROM requests ORDER BY created_at ASC`
    );
    return stmt.all();
  }

  getExecutionsByRequest(requestId: number) {
    const stmt = this.db.prepare(`
      SELECT *
      FROM executions
      WHERE request_id = ?
      ORDER BY step_index ASC
    `);

    return stmt.all(requestId);
  }

  clearRequests() {
    this.db.exec(`DELETE FROM requests`);
    this.db.exec(`DELETE FROM executions`);
  }
}
