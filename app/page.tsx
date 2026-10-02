import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Тоқ бар ма?</h1>
      <p className="text-muted-foreground">
        Карта плановых отключений электроэнергии в Алматы. Скоро здесь будет поиск по улице.
      </p>
      <Button>Проверка shadcn/ui</Button>
    </main>
  );
}
