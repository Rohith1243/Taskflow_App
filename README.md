# TaskFlow — Task Management Application

A clean, responsive task management web app with user authentication, full CRUD operations, real-time simulation, and a polished dark UI.

## Files

| File | Purpose |
|------|---------|
| `index.html` | App structure — auth screen, app layout, modal, toast |
| `styles.css`  | All styles — dark theme, responsive layout, components |
| `app.js`      | All logic — auth, CRUD, filtering, sorting, real-time |

## Features

### Authentication
- Register a new account (stored in `localStorage`)
- Sign in with email + password
- Session persists via `sessionStorage` (survives page refresh)
- Demo credentials: `demo@taskflow.app` / `demo123`

### Task CRUD
- **Create** tasks with title, description, status, priority, category, and due date
- **Read** with live search, filtering, and sorting
- **Update** via the Edit button (opens pre-filled modal)
- **Delete** with confirmation prompt
- **Toggle completion** with the circular checkbox

### Tracking & Views
- Stats bar: Total / Done / In Progress / Overdue
- Sidebar views: All, Due Today, In Progress, Completed, Work, Personal, Urgent
- Filter by status or priority
- Sort by newest, due date, priority, or A–Z

### Real-time Updates (Simulated)
- A pulsing "Live" badge in the top bar
- Every 20–45 seconds, a simulated teammate update fires
- In production, replace `startRealtimeSimulation()` with a WebSocket / SSE connection

### Responsive Design
- Sidebar collapses on mobile with a hamburger menu
- Stats reflow to a 2-column grid on smaller screens
- Touch-friendly tap targets throughout
- Works on all screen sizes from 320px up

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Esc` | Close modal |
| `Ctrl/Cmd + N` | New task |
| `Ctrl/Cmd + K` | Focus search |

## Getting Started

1. Open `index.html` in any modern browser — no build step required.
2. Sign in with the demo account or register a new one.
3. Your tasks are saved to `localStorage` per user account.

## Replacing Simulated Real-time with WebSockets

In `app.js`, find `startRealtimeSimulation()` and replace it:

```js
// Example WebSocket integration
function startRealtimeSimulation() {
  const ws = new WebSocket('wss://your-server.com/tasks');

  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    const task = tasks.find(t => t.id === update.id);
    if (task) {
      Object.assign(task, update);
      saveTasks();
      renderTasks();
      toast('🔄 Task updated by a teammate', 'blue');
    }
  };
}
```

## Tech Stack
- Vanilla HTML, CSS, JavaScript (no frameworks or build tools)
- Google Fonts: DM Sans + Space Mono
- Data stored in `localStorage` / `sessionStorage`
