const API_URL = 'https://quick.glcpaints.com:7003/General/GeneralAPI/';

export async function apiCall(operation, params = {}) {
  const body = {
    Operation: operation,
    LineData: '',
    User: params.User || '',
    FireBaseToken: '',
    AppVersionWeb: '1.0',
    AppVersionAndroid: '',
    AppVersionIos: '',
    AppVersionDesktop: '',
    PlatForm: 'Web',
    SqlStatement: '',
    ...params,
  };

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
