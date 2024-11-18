const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database('./todos.db', (err) => {
  if (err) {
    console.error("Error opening database:", err);
  } else {
    console.log("Connected to SQLite database.");
    db.run(
      `CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task TEXT NOT NULL,
        completed BOOLEAN NOT NULL DEFAULT 0,
        priority TEXT NOT NULL DEFAULT 'medium'
      )`
    );
  }
});

// GET /todos - Retrieve all to-do items or filter by completed status
app.get('/todos', (req, res) => {
  const { completed } = req.query;
  let sql = "SELECT * FROM todos";
  const params = [];
  if (completed !== undefined) {
    sql += " WHERE completed = ?";
    params.push(completed === 'true' ? 1 : 0);
  }
  db.all(sql, params, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// POST /todos - Add a new to-do item
app.post('/todos', (req, res) => {
  const { task, priority } = req.body;
  if (!task) {
    return res.status(400).json({ error: "Task field is required." });
  }
  const sql = `INSERT INTO todos (task, priority) VALUES (?, ?)`;
  db.run(sql, [task, priority || "medium"], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.status(201).json({ id: this.lastID, task, completed: false, priority: priority || "medium" });
    }
  });
});

// PUT /todos/:id - Update an existing to-do item
app.put('/todos/:id', (req, res) => {
  const id = req.params.id;
  const { task, completed, priority } = req.body;
  const sql = `UPDATE todos SET task = COALESCE(?, task), 
                                completed = COALESCE(?, completed), 
                                priority = COALESCE(?, priority)
               WHERE id = ?`;
  db.run(sql, [task, completed !== undefined ? (completed ? 1 : 0) : null, priority, id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: "To-Do item not found." });
    } else {
      res.json({ message: "To-Do item updated." });
    }
  });
});

// PUT /todos/complete-all - Mark all to-do items as completed
app.put('/todos/complete-all', (req, res) => {
  const sql = `UPDATE todos SET completed = 1`;
  db.run(sql, function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: "All to-do items marked as completed." });
    }
  });
});

// DELETE /todos/:id - Delete a to-do item
app.delete('/todos/:id', (req, res) => {
  const id = req.params.id;
  const sql = `DELETE FROM todos WHERE id = ?`;
  db.run(sql, [id], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (this.changes === 0) {
      res.status(404).json({ error: "To-Do item not found." });
    } else {
      res.status(204).send();
    }
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
