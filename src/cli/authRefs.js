const ENV_NAME_RE = /^[A-Z_][A-Z0-9_]*$/;

function assertSafeEnvName(name) {
  if (typeof name !== 'string' || !ENV_NAME_RE.test(name.trim())) {
    throw new Error(`Invalid env var name: must match ${ENV_NAME_RE}`);
  }
}

export function resolveAuthBundle(cli, env = process.env) {
  const inline = cli.auth ? String(cli.auth).trim() : null;
  const envName = cli.authEnv ? String(cli.authEnv).trim() : null;
  const inlineAlt = cli.authAlt ? String(cli.authAlt).trim() : null;
  const envNameAlt = cli.authAltEnv ? String(cli.authAltEnv).trim() : null;

  if (inline && envName) throw new Error('Use either --auth or --auth-env, not both');
  if (inlineAlt && envNameAlt) throw new Error('Use either --auth-alt or --auth-alt-env, not both');

  let auth = inline;
  if (envName) {
    assertSafeEnvName(envName);
    const v = env[envName];
    if (!v || !String(v).trim()) throw new Error(`Environment variable ${envName} is unset/empty`);
    auth = String(v).trim();
  }

  let authAlt = inlineAlt;
  if (envNameAlt) {
    assertSafeEnvName(envNameAlt);
    const v = env[envNameAlt];
    if (!v || !String(v).trim()) throw new Error(`Environment variable ${envNameAlt} is unset/empty`);
    authAlt = String(v).trim();
  }

  return { auth, authAlt };
}
