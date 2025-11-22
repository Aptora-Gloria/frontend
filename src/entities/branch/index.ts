import type { BranchDto } from '@shared/lib/dto/branch-dto';

export interface Branch {
    name: string;
    repoId: number;
}

export const mapBranchDtoToEntity = (dto: BranchDto): Branch => ({
    name: dto.name,
    repoId: dto.repo_id
});
