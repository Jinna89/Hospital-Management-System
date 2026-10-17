import type { Request, Response } from 'express';
import { sendSuccess } from '../../utils/apiResponse';
import { getActor } from '../../lib/request';
import { usersService } from './users.service';

export const usersController = {
  async getMe(req: Request, res: Response) {
    const user = await usersService.getProfile(getActor(req).id);
    sendSuccess(res, { message: 'Profile retrieved', data: user });
  },

  async updateMe(req: Request, res: Response) {
    const user = await usersService.updateProfile(getActor(req).id, req.body);
    sendSuccess(res, { message: 'Profile updated', data: user });
  },
};
