const proxy = [
    {
      context: '/APIFramework/token',
      target: 'https://intranet.santanadeparnaiba.sp.gov.br',
      secure: false,
      logLevel: "debug",
      changeOrigin: true,
      headers: {
        Connection:'keep-alive'
        }
    }
  ];
  module.exports = proxy;