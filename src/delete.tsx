import React from 'react'
import { 
    Box, 
    TextInput, 
    Title, 
    Button, 
    Alert, 
    Transition, 
    SegmentedControl,
    Group,
    Text,
    Badge,
} from '@mantine/core'
import { TbAlertCircle, TbCheck, TbTrash, TbLinkOff } from "react-icons/tb";
import PatientModeSelector from './components/patientMode';

interface DeleteProps {
    role: string;
    operatorNumber: string;
}

function Delete({ role, operatorNumber }: DeleteProps) {

    // --- STATE: MODE SWITCH (Delete Record vs Unlink) ---
    const [mode, setMode] = React.useState<string>("record"); // 'record' | 'relation'

    // --- STATE: DELETE RECORD ---
    const [hn, setHn] = React.useState<string>("");
    const [targetType, setTargetType] = React.useState<string>("child"); 

    // --- STATE: UNLINK RELATION ---
    const [parentHn, setParentHn] = React.useState<string>("");
    const [childHn, setChildHn] = React.useState<string>("");
    
    // --- STATE: SHARED ---
    const [alert, setAlert] = React.useState<{ show: boolean, type: 'success'|'error', msg: string }>({
        show: false, type: 'success', msg: ''
    });
    const [loading, setLoading] = React.useState<boolean>(false);

    // Auto-hide alert
    React.useEffect(() => {
        if (alert.show) {
            const timer = setTimeout(() => setAlert({ ...alert, show: false }), 4000);
            return () => clearTimeout(timer);
        }
    }, [alert.show]);

    // 1. HANDLE DELETE RECORD (Existing)
    const handleDelete = async () => {
        if (!hn.trim()) {
            setAlert({ show: true, type: 'error', msg: "Please enter a Hospital Number." });
            return;
        }

        setLoading(true);

        try {
            let result;
            if (role === 'admin') {
                if (targetType === 'child') result = await window.electronAPI.hardDeleteChild(hn, operatorNumber);
                else result = await window.electronAPI.hardDeleteParent(hn, operatorNumber);
            } else {
                if (targetType === 'child') result = await window.electronAPI.deactivateChild(hn, operatorNumber);
                else result = await window.electronAPI.deactivateParent(hn, operatorNumber);
            }

            if (result.success) {
                setAlert({ show: true, type: 'success', msg: `Successfully deleted ${hn}.` });
                setHn(""); 
            } else {
                setAlert({ show: true, type: 'error', msg: result.message || "Delete failed." });
            }

        } catch (err: any) {
            setAlert({ show: true, type: 'error', msg: err.message || "System Error." });
        } finally {
            setLoading(false);
        }
    };

    // 2. HANDLE UNLINK RELATION (New)
    const handleUnlink = async () => {
        if (!parentHn.trim() || !childHn.trim()) {
            setAlert({ show: true, type: 'error', msg: "Please enter BOTH Parent HN and Child HN." });
            return;
        }

        setLoading(true);

        try {
            const result = await window.electronAPI.unlinkParentChild(parentHn, childHn, operatorNumber);

            if (result.success) {
                setAlert({ show: true, type: 'success', msg: `Successfully unlinked ${parentHn} and ${childHn}.` });
                setParentHn("");
                setChildHn("");
            } else {
                setAlert({ show: true, type: 'error', msg: result.message || "Unlink failed." });
            }

        } catch (err: any) {
            setAlert({ show: true, type: 'error', msg: err.message || "System Error." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <Box p="md" maw={600} mx="auto">
            
            {/* MAIN MODE SWITCH */}
            <SegmentedControl
                fullWidth
                size="md"
                value={mode}
                onChange={setMode}
                data={[
                    { label: 'Delete Record', value: 'record' },
                    { label: 'Unlink Relation', value: 'relation' },
                ]}
                mb="lg"
                color={mode === "relation" ? "violet.4" : "blue.6"}
            />

            <Box 
                p="lg" 
                bd={
                    `5px solid ` + (mode === "relation" ? "black" : targetType === "child" ? "orange" : "green")
                } 
                bdrs="md" 
                style={{transition:"border-color 0.3s ease"}}
            >
                
                {/* ================= MODE 1: DELETE RECORD ================= */}
                {mode === 'record' && (
                    <>
                        <Group justify="space-between" mb="md">
                            <Title order={3}>Delete Patient</Title>
                            <Badge color={role === 'admin' ? 'red' : 'blue'} size="lg">
                                {role === 'admin' ? 'Hard Delete' : 'Soft Delete'}
                            </Badge>
                        </Group>

                        <Text mb="xs" fw={500}>Select Target:</Text>

                        <PatientModeSelector title={null} patient={targetType} setPatient={setTargetType}/>

                        <TextInput
                            label="Hospital Number (HN)"
                            placeholder="e.g. C-001"
                            value={hn}
                            onChange={(e) => setHn(e.currentTarget.value)}
                            size="md"
                            mb="lg"
                        />

                        <Button 
                            fullWidth 
                            color="red" 
                            size="lg" 
                            onClick={handleDelete} 
                            loading={loading}
                            leftSection={<TbTrash />}
                        >
                            {role === 'admin' ? 'Permanent Delete' : 'Deactivate Record'}
                        </Button>
                    </>
                )}

                {/* ================= MODE 2: UNLINK RELATION ================= */}
                {mode === 'relation' && (
                    <>
                         <Group justify="space-between" mb="md">
                            <Title order={3}>Unlink Relation</Title>
                            <Badge color="violet.5" size="lg">Relation</Badge>
                        </Group>

                        <Text c="dimmed" size="sm" mb="md">
                            This will remove the link between a Parent and a Child. The patient records themselves will NOT be deleted.
                        </Text>

                        <TextInput
                            label="Parent HN"
                            placeholder="e.g. P-001"
                            value={parentHn}
                            onChange={(e) => setParentHn(e.currentTarget.value)}
                            size="md"
                            mb="sm"
                        />

                        <TextInput
                            label="Child HN"
                            placeholder="e.g. C-001"
                            value={childHn}
                            onChange={(e) => setChildHn(e.currentTarget.value)}
                            size="md"
                            mb="lg"
                        />

                        <Button 
                            fullWidth 
                            color="violet.5" 
                            size="lg" 
                            onClick={handleUnlink} 
                            loading={loading}
                            leftSection={<TbLinkOff />}
                        >
                            Unlink Relation
                        </Button>
                    </>
                )}

            </Box>

            {/* Alert Notification */}
            <Transition mounted={alert.show} transition="fade-up" duration={400} timingFunction="ease">
                {(styles) => (
                    <Alert
                        style={{ ...styles, position: 'fixed', bottom: 20, right: 20, width: 350, zIndex: 1000 }}
                        variant="filled"
                        color={alert.type === 'success' ? 'green' : 'red'}
                        title={alert.type === 'success' ? 'Success' : 'Error'}
                        icon={alert.type === 'success' ? <TbCheck /> : <TbAlertCircle />}
                        withCloseButton
                        onClose={() => setAlert({ ...alert, show: false })}
                    >
                        {alert.msg}
                    </Alert>
                )}
            </Transition>
        </Box>
    )
}

export default Delete