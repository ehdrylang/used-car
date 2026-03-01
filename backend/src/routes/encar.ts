import { Router, Request, Response } from 'express';
import {
  getCarBasicInfo,
  getCarRecord,
  getCarInspection,
  getSellerInfo,
} from '../services/encarService';

const router = Router();

// 차량 전체 정보 한 번에 조회 (기본정보 + 이력 + 성능점검 + 판매자)
router.get('/car/:carid', async (req: Request, res: Response) => {
  const carid = req.params.carid as string;
  try {
    // 기본정보와 이력/성능점검은 병렬 호출
    const [basicInfo, record, inspection] = await Promise.all([
      getCarBasicInfo(carid).catch(() => null),
      getCarRecord(carid).catch(() => null),
      getCarInspection(carid).catch(() => null),
    ]);

    // 판매자 ID는 성능점검에서 추출 후 조회
    const sellerId = inspection?.inspectionSource?.registrantId ?? null;
    const seller = sellerId
      ? await getSellerInfo(sellerId).catch(() => null)
      : null;

    if (!basicInfo && !record && !inspection) {
      res.status(404).json({ error: '차량 정보를 찾을 수 없습니다.' });
      return;
    }

    res.json({ basicInfo, record, inspection, seller });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

export default router;
