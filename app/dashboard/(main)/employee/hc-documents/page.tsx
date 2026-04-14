import { HCEdaranTable } from '@/components/hc/HCEdaranTable';

export default function EmployeeHCDocumentsPage() {
    return (
        <HCEdaranTable
            mode="read"
            title="Edaran HC"
            description="Daftar kegiatan HC beserta link dokumentasinya."
        />
    );
}
