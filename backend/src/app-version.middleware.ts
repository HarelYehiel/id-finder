import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class AppVersionMiddleware implements NestMiddleware {

  use(req: Request, res: Response, next: NextFunction) {

    const appBuildHeader = req.header('x-app-build');

    const minSupportedBuild = 2;

    const appBuild = Number(appBuildHeader);

    if (!appBuildHeader || Number.isNaN(appBuild) || appBuild < minSupportedBuild) {

      return res.status(426).json({
        updateRequired: true,
        message: 'יש לעדכן את האפליקציה לגרסה החדשה',
        minSupportedBuild
      });

    }

    next();
  }
}