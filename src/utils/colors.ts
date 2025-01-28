export function generateRandomColor(): string {
  const colors = [
    "#F87171",
    "#FB923C",
    "#FBBF24",
    "#34D399",
    "#60A5FA",
    "#818CF8",
    "#A78BFA",
    "#F472B6",
    "#94A3B8",
    "#6EE7B7",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
