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
    Badge
} from '@mantine/core'
import { TbAlertCircle, TbCheck, TbTrash } from "react-icons/tb";

function Delete({ role }: { role: string }) {

    const [hn, setHn] = React.useState<string>("");
    const [targetType, setTargetType] = React.useState<string>("child"); // 'child' or 'parent'
    
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

    const handleDelete = async () => {
        if (!hn.trim()) {
            setAlert({ show: true, type: 'error', msg: "Please enter a Hospital Number." });
            return;
        }

        setLoading(true);

        try {
            let result;
            console.log(`🚀 [UI] Deleting ${targetType} ${hn} as role: ${role}`);

            // --- LOGIC: ROLE BASED DELETE ---
            if (role === 'admin') {
                // ADMIN = HARD DELETE
                if (targetType === 'child') {
                    result = await window.electronAPI.hardDeleteChild(hn);
                } else {
                    result = await window.electronAPI.hardDeleteParent(hn);
                }
            } else {
                // USER = SOFT DELETE (Deactivate)
                if (targetType === 'child') {
                    result = await window.electronAPI.deactivateChild(hn);
                } else {
                    result = await window.electronAPI.deactivateParent(hn);
                }
            }

            if (result.success) {
                setAlert({ show: true, type: 'success', msg: `Successfully deleted ${hn} (${role === 'admin' ? 'Hard' : 'Soft'}).` });
                setHn(""); // Clear input on success
            } else {
                setAlert({ show: true, type: 'error', msg: result.message || "Delete failed." });
            }

        } catch (err: any) {
            setAlert({ show: true, type: 'error', msg: err.message || "System Error during delete." });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box p="md" maw={600} mx="auto">
            <Box p="lg" bd="2px black solid" bdrs="sm">
                <Group justify="space-between" mb="md">
                    <Title order={3}>Delete Patient</Title>
                    <Badge color={role === 'admin' ? 'red' : 'blue'} size="lg">
                        {role === 'admin' ? 'Hard Delete Mode' : 'Soft Delete Mode'}
                    </Badge>
                </Group>

                <Text mb="xs" fw={500}>Select Target:</Text>
                <SegmentedControl
                    fullWidth
                    value={targetType}
                    onChange={setTargetType}
                    data={[
                        { label: 'Child', value: 'child' },
                        { label: 'Parent', value: 'parent' },
                    ]}
                    mb="md"
                />

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