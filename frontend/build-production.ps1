$env:REACT_APP_API_URL="https://api.thegathrd.com/api"
Remove-Item -Recurse -Force build -ErrorAction SilentlyContinue
npm run build
