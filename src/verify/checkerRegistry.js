export const GRAPHQLAI_CHECKERS = [
  {
    checkerId: 'cross_principal_same_body',
    title: 'Same body across principals',
    precondition: 'Primary and alternate auth replay both return 200 with same body fingerprint',
    owaspMapping: ['API1:2023', 'API5:2023'],
    bountyTierHint: 'high',
  },
  {
    checkerId: 'cross_principal_field_diff',
    title: 'Field-level response differs across principals',
    precondition: 'Planned',
    owaspMapping: ['API1:2023', 'API5:2023'],
    bountyTierHint: 'high',
  },
];
