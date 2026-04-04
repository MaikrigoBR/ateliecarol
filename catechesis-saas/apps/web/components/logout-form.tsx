type LogoutFormProps = {
  redirectTo: string;
  className?: string;
};

export function LogoutForm({ redirectTo, className = 'secondary-link button-reset' }: Readonly<LogoutFormProps>) {
  return (
    <form action="/auth/logout" method="post">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button className={className} type="submit">
        Encerrar sessao
      </button>
    </form>
  );
}
