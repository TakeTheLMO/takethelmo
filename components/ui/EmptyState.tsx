import { Card } from "./Card";

export function EmptyState({ message }: { message: string }) {
  return (
    <Card className="flex min-h-32 items-center justify-center border-dashed text-center text-sm text-gray-500">
      {message}
    </Card>
  );
}
