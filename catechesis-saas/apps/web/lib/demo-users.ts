export type DemoCredential = {
  profile: string;
  tenantSlug: string;
  email: string;
  password: string;
  description: string;
};

const universalCredentials: DemoCredential[] = [
  {
    profile: 'Desenvolvedor global',
    tenantSlug: '*',
    email: 'dev@platform.local',
    password: 'Dev@123',
    description: 'Pode entrar em qualquer tenant e acessar a visao administrativa.'
  }
];

const tenantCredentials: Record<string, DemoCredential[]> = {
  emmaus: [
    {
      profile: 'Administrador',
      tenantSlug: 'emmaus',
      email: 'admin@emmaus.local',
      password: 'Admin@123',
      description: 'Acesso ao painel institucional e configuracoes do tenant.'
    },
    {
      profile: 'Professor',
      tenantSlug: 'emmaus',
      email: 'teacher@emmaus.local',
      password: 'Teacher@123',
      description: 'Acesso ao painel pedagogico com trilhas e regras em vigor.'
    },
    {
      profile: 'Aluno',
      tenantSlug: 'emmaus',
      email: 'student@emmaus.local',
      password: 'Student@123',
      description: 'Acesso ao tenant como participante autenticado.'
    }
  ]
};

export function listDemoCredentials(tenantSlug: string) {
  return [
    ...universalCredentials.map((credential) => ({
      ...credential,
      tenantSlug
    })),
    ...(tenantCredentials[tenantSlug] ?? [])
  ];
}
