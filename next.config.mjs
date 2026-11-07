export default {
 devIndicators:false,allowedDevOrigins:['127.0.0.1','localhost'],output:'standalone',
 async rewrites(){return [{source:'/api/game/:path*',destination:`${process.env.GAME_SERVER_HTTP_URL||'http://127.0.0.1:3030'}/:path*`}];},
};
