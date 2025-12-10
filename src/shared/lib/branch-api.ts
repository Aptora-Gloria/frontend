// src/shared/lib/branch-api.ts
import apiClient from './api-client';
import type { BranchDto } from './dto/branch-dto';
import { mapBranchDtoToEntity } from '@/entities/branch';
import type { Branch } from '@/entities/branch';

const BASE_URL = '/api/github/branches';

/**
 * GET /api/github/branches/query?fullName=owner/repo
 */
export const getBranchesByRepo = async (fullName: string): Promise<Branch[]> => {
    const response = await apiClient.get<BranchDto[]>(
        `${BASE_URL}/query`,
        {
            params: { fullName }, // <-- query param
        },
    );

    return response.data.map(mapBranchDtoToEntity);
};

/**
 * POST /api/github/branches/init?fullName=owner/repo
 * (Postman'de yaptığın init çağrısı ile birebir aynı)
 */
export const initBranchesByRepo = async (fullName: string): Promise<Branch[]> => {
    const response = await apiClient.post<BranchDto[]>(
        `${BASE_URL}/init`,
        null,                // body yok
        {
            params: { fullName }, // <-- query param
        },
    );

    return response.data.map(mapBranchDtoToEntity);
};
