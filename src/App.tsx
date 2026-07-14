export default function App() {
  return (
    <div className="shell">
      <div className="titlebar" data-tauri-drag-region />
      <div className="shell-body">
        <main className="shell-main">
          <div className="content">
            <h1 style={{ fontSize: 26, letterSpacing: "-0.4px" }}>Today</h1>
          </div>
        </main>
      </div>
    </div>
  );
}
