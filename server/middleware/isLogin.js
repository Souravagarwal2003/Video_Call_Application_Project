import jwt from 'jsonwebtoken';
import User from '../schema/userSchema.js';

const isLogin = async (req, res, next) => {
  try {
    const token =
      req.cookies.jwt ||
      req.headers.cookie?.split('; ').find((cookie) => cookie.startsWith('jwt='))?.split('=')[1];

    if (!token) return res.status(401).send({ success: false, message: 'Unauthorized - No Token' });

    const decode = jwt.verify(token, process.env.JWT_SECRET);
    if (!decode) return res.status(401).send({ success: false, message: 'Unauthorized - Invalid Token' });

    const user = await User.findById(decode.userId).select('-password');
    if (!user) return res.status(404).send({ success: false, message: 'User not found' });

    req.user = user;
    next();
  } catch (error) {
    console.error(`error in isLogin middleware: ${error.message}`);
    res.status(500).send({
      success: false,
      message: 'Server Error',
    });
  }
};

export default isLogin;
