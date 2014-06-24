function remember(key, value) {
  if (value) localStorage.setItem(key, value);
  else value = localStorage.getItem(key);
  
  return value;
}
