import { DivisionDocumentLibrary } from '@/components/workspace/DivisionDocumentLibrary';

export default function EmployeeHCDocumentsPage() {
    return (
        <DivisionDocumentLibrary
            division="HC"
            experience="inbox"
            title="Edaran HC"
            description="Buka dokumen HC yang relevan untuk Anda."
        />
    );
}
