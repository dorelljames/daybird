export default function PlaceholderView({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="content placeholder-view">
      <h1>{title}</h1>
      <p>{hint}</p>
    </div>
  );
}
