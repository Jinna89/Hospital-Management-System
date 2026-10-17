import type { Request, Response } from 'express';
import { authService } from './auth.service';
import { sendSuccess } from '../../utils/apiResponse';
import { getActor, requestMeta } from '../../lib/request';

export const authController = {
  async register(req: Request, res: Response) {
    const result = await authService.register(req.body, requestMeta(req));
    sendSuccess(res, { statusCode: 201, message: 'Registration successful', data: result });
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body, requestMeta(req));
    sendSuccess(res, { message: 'Login successful', data: result });
  },

  async refreshToken(req: Request, res: Response) {
    const result = await authService.refresh(req.body.refreshToken, requestMeta(req));
    sendSuccess(res, { message: 'Token refreshed successfully', data: result });
  },

  async logout(req: Request, res: Response) {
    await authService.logout(req.body.refreshToken);
    sendSuccess(res, { message: 'Logout successful' });
  },

  async me(req: Request, res: Response) {
    const user = await authService.me(getActor(req).id);
    sendSuccess(res, { message: 'Current session', data: user });
  },
};
