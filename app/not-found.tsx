import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MoveLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="text-center space-y-6 max-w-md">
                <div className="flex justify-center">
                    <div className="bg-blue-100 p-6 rounded-full">
                        <FileQuestion className="h-16 w-16 text-blue-600" />
                    </div>
                </div>

                <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
                    Página No Encontrada
                </h1>

                <p className="text-slate-600 text-lg">
                    Lo sentimos, parece que la página que buscas no existe o ha sido movida.
                </p>

                <div className="pt-4">
                    <Link href="/">
                        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                            <MoveLeft className="h-4 w-4" />
                            Volver al Inicio
                        </Button>
                    </Link>
                </div>

                <p className="text-xs text-slate-400 mt-8">
                    Lexis Bill &copy; {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}
