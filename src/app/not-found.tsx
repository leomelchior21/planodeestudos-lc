import Link from "next/link";
export default function NotFound() {
  return (
    <main className="error-page">
      <h1>Plano não encontrado</h1>
      <p>Este endereço não corresponde a um plano salvo.</p>
      <Link className="button primary" href="/student">
        Criar meu plano
      </Link>
    </main>
  );
}
