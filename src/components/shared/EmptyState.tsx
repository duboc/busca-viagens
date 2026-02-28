export default function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 transition-colors">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mb-4 transition-colors">{description}</p>
      {action}
    </div>
  );
}
