export interface CarPhoto {
  path: string;
  code: string;
  type: string;
  url: string;
}

export interface CarBasicInfo {
  vehicleId: number;
  manufacturer: string;
  model: string;
  badge: string;
  year: string;
  mileage: number;
  price: number;
  fuelType: string;
  transmission: string;
  color: string;
  region: string;
  photos: CarPhoto[];
}

export interface Accident {
  type: string; // "1"=내차, "2"=상대차, "3"=양쪽
  date: string;
  insuranceBenefit: number;
  partCost: number;
  laborCost: number;
  paintingCost: number;
}

export interface CarRecord {
  ownerChangeCnt: number;
  ownerChanges: string[];
  myAccidentCnt: number;
  otherAccidentCnt: number;
  myAccidentCost: number;
  otherAccidentCost: number;
  totalLossCnt: number;
  floodTotalLossCnt: number;
  floodPartLossCnt: number | null;
  business: number;
  government: number;
  accidents: Accident[];
  maker: string;
  model: string;
  fuel: string;
  firstDate: string;
}

export interface OuterPanel {
  type: { code: string; title: string };
  statusTypes: { code: string; title: string }[];
  attributes: string[];
}

export interface CarInspection {
  master: {
    accdient: boolean;
    simpleRepair: boolean;
    detail: {
      vin: string;
      mileage: number;
      colorType: { code: string; title: string };
      waterlog: boolean;
      firstRegistrationDate: string;
    };
  };
  outers: OuterPanel[];
  inspectionSource: {
    registrantId: string;
  };
}

export interface SellerInfo {
  userId: string;
  userName: string;
  userType: string;
  joinedDatetime: string;
  companyList: {
    companyName: string;
    address: { sido: string; sigungu: string };
  }[];
  salesStatus: {
    currentlyOnSales: number;
    totalSales: number;
  };
}

export interface CarDetailResponse {
  basicInfo: CarBasicInfo | null;
  record: CarRecord | null;
  inspection: CarInspection | null;
  seller: SellerInfo | null;
}
