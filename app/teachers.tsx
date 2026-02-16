import ManagementModule from '@/components/ManagementModule';
import { Presentation } from 'lucide-react-native';

export default function TeachersScreen() {
    return (
        <ManagementModule
            title="Profesores"
            type="teacher"
            placeholderExtra="Especialidad"
            iconExtra={Presentation}
        />
    );
}
