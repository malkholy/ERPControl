const IS_DEV = import.meta.env.DEV;
const API_URL = IS_DEV
  ? '/api/General/GeneralAPI/'
  : 'https://quick.glcpaints.com:7003/General/GeneralAPI/';

const BASE_BODY = {
  AppVersionWeb: '225',
  AppVersionAndroid: '225',
  AppVersionIos: '225',
  AppVersionDesktop: '225',
  FireBaseToken: '',
  PlatForm: 'web',
  deviceID: '',
  IP: '192.168.1.3'
};

export async function apiCall(operation, lineData = null, extraParams = {}) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'SP_Name': 'APIERPControlOperation'
    },
    body: JSON.stringify({
      ...BASE_BODY,
      Operation: operation,
      LineData: lineData ? JSON.stringify(lineData) : null,
      User: sessionStorage.getItem('FullName') || '',
      ...extraParams
    })
  });
  const text = await res.text();
  console.log(operation, 'raw:', text);
  if (!text) throw new Error('Empty response from server');
  return JSON.parse(text);
}



