export const auth = {
  get: () => JSON.parse(localStorage.getItem('auth') || 'null'),
  set: (a) => (a ? localStorage.setItem('auth', JSON.stringify(a)) : localStorage.removeItem('auth')),
};

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(auth.get() && { authorization: `Bearer ${auth.get().token}` }) },
    body: body && JSON.stringify(body),
  });
  if (res.status === 401 && !path.startsWith('/auth')) {
    auth.set(null);
    location.assign('/login');
  }
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(data?.error || res.statusText);
  return data;
}
