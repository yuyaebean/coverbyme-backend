import jwt from 'jsonwebtoken';
import { Context, Next } from 'koa';

import User from '../model/user';

type DecodedJWT = {
  _id: string;
  username: string;
  iat: number;
  exp: number;
};

const jwtMiddleware = async (ctx: Context, next: Next): Promise<any> => {
  const token = ctx.cookies.get('access_token');
  if (!token) return next();

  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET not exist.');
      throw Error;
    }
    const decoded = <DecodedJWT>jwt.verify(token, process.env.JWT_SECRET);
    ctx.state.user = {
      _id: decoded._id,
      username: decoded.username,
    };

    // token의 남은 유효 기간이 3.5일 미만이면 재발급
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp - now < 60 * 60 * 24 * 3.5) {
      const user = await User.findById(decoded._id);
      const token = user?.generateToken();

      if (!user || !token) throw Error;

      ctx.cookies.set('access_token', token, {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: true,
        secureProxy: true,
        sameSite: 'none',
      });
    }

    return next();
  } catch (e) {
    // 토큰 검증 실패
    return next();
  }
};

export default jwtMiddleware;
