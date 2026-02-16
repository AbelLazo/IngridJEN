import ManagementModule from '@/components/ManagementModule';
import { Book } from 'lucide-react-native';

export default function StudentsScreen() {
    return (
        <ManagementModule
            title="Estudiantes"
            type="student"
            placeholderExtra="Curso/Grado"
            iconExtra={Book}
        />
    );
}
