import React, { useState } from 'react';
import { 
    Box, Title, Grid, Button, Group, Radio, Input, NumberInput, Text, JsonInput
} from '@mantine/core';
import { DateInput, DatesProvider } from '@mantine/dates';

interface PatientForm {
    hn: string;
    firstname: string;
    lastname: string;
    age: number | '';
    sex: string;
    dob: Date | null;
    r1: number[];
    r2: number[];
    r3: number[];
}

const initialFormState: PatientForm = {
    hn: '', firstname: '', lastname: '', age: '', sex: '', dob: null,
    r1: [], r2: [], r3: []
};

// Helper to parse string input into number array
const parseVectorInput = (input: string): number[] => {
    try {
        // Try parsing as JSON first (e.g., "[0.1, 0.2]")
        const parsed = JSON.parse(input);
        if (Array.isArray(parsed)) return parsed;
    } catch (e) {
        // If not JSON, try splitting by comma (e.g., "0.1, 0.2")
        const split = input.split(',').map(n => parseFloat(n.trim())).filter(n => !isNaN(n));
        if (split.length > 0) return split;
    }
    return [];
};

const PatientInputSection = ({ 
    title, data, updateFunc 
}: { title: string, data: PatientForm, updateFunc: (f: keyof PatientForm, v: any) => void }) => (
    <Box p="md" mb="md" bd="1px solid #e0e0e0" style={{ borderRadius: '8px' }}>
        <Title order={5} mb="sm">{title}</Title>
        <Grid>
            <Grid.Col span={4}>
                <Input.Wrapper label="HN" withAsterisk>
                    <Input placeholder="HN" value={data.hn} onChange={(e) => updateFunc('hn', e.target.value)} />
                </Input.Wrapper>
            </Grid.Col>
            <Grid.Col span={4}>
                <Input.Wrapper label="First name" withAsterisk>
                    <Input placeholder="First Name" value={data.firstname} onChange={(e) => updateFunc('firstname', e.target.value)} />
                </Input.Wrapper>
            </Grid.Col>
            <Grid.Col span={4}>
                <Input.Wrapper label="Last name" withAsterisk>
                    <Input placeholder="Last Name" value={data.lastname} onChange={(e) => updateFunc('lastname', e.target.value)} />
                </Input.Wrapper>
            </Grid.Col>
            <Grid.Col span={4}>
                <NumberInput label="Age" placeholder="Age" withAsterisk value={data.age} onChange={(val) => updateFunc('age', val)} min={0} max={150} />
            </Grid.Col>
            <Grid.Col span={4}>
                <DatesProvider settings={{ locale: "th" }}>
                    <DateInput 
                        label="Date of Birth" 
                        placeholder="DD/MM/YYYY" 
                        withAsterisk
                        valueFormat="DD/MM/YYYY"
                        value={data.dob}
                        onChange={(val) => updateFunc('dob', val)}
                    />
                </DatesProvider>
            </Grid.Col>
            <Grid.Col span={4}>
                <Radio.Group label="Sex" withAsterisk value={data.sex} onChange={(val) => updateFunc('sex', val)}>
                    <Group mt="xs">
                        <Radio value="M" label="Male" />
                        <Radio value="F" label="Female" />
                    </Group>
                </Radio.Group>
            </Grid.Col>
            
            {/* NEW: Manual Vector Input Area */}
            <Grid.Col span={12}>
                <Text size="sm" fw={500} mt="sm" mb="xs">Biometric Vectors (Paste Dummy Data)</Text>
                <Grid>
                    <Grid.Col span={4}>
                        <Input.Wrapper label="Vector R1" description={data.r1.length > 0 ? "✅ Loaded" : "❌ Empty"}>
                            <Input 
                                placeholder="[0.1, 0.2, ...]" 
                                onChange={(e) => updateFunc('r1', parseVectorInput(e.target.value))}
                            />
                        </Input.Wrapper>
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Input.Wrapper label="Vector R2" description={data.r2.length > 0 ? "✅ Loaded" : "❌ Empty"}>
                            <Input 
                                placeholder="[0.1, 0.2, ...]" 
                                onChange={(e) => updateFunc('r2', parseVectorInput(e.target.value))}
                            />
                        </Input.Wrapper>
                    </Grid.Col>
                    <Grid.Col span={4}>
                        <Input.Wrapper label="Vector R3" description={data.r3.length > 0 ? "✅ Loaded" : "❌ Empty"}>
                            <Input 
                                placeholder="[0.1, 0.2, ...]" 
                                onChange={(e) => updateFunc('r3', parseVectorInput(e.target.value))}
                            />
                        </Input.Wrapper>
                    </Grid.Col>
                </Grid>
            </Grid.Col>
        </Grid>
    </Box>
);

function Registry() {
    const [childForm, setChildForm] = useState<PatientForm>({ ...initialFormState });
    const [parentForm, setParentForm] = useState<PatientForm>({ ...initialFormState });

    const updateChild = (field: keyof PatientForm, value: any) => {
        setChildForm(prev => ({ ...prev, [field]: value }));
    };
    const updateParent = (field: keyof PatientForm, value: any) => {
        setParentForm(prev => ({ ...prev, [field]: value }));
    };

    const handleReset = () => {
        setChildForm({ ...initialFormState });
        setParentForm({ ...initialFormState });
    };

    const getMissingFields = (form: PatientForm) => {
        const errors: string[] = [];
        if (!form.hn.trim()) errors.push("HN");
        if (!form.firstname.trim()) errors.push("First Name");
        if (!form.lastname.trim()) errors.push("Last Name");
        if (form.age === '') errors.push("Age");
        if (!form.sex) errors.push("Sex");
        if (!form.dob) errors.push("Date of Birth");
        
        // Strict Vector Check
        if (form.r1.length === 0) errors.push("Vector R1");
        if (form.r2.length === 0) errors.push("Vector R2");
        if (form.r3.length === 0) errors.push("Vector R3");
        
        return errors;
    };

    const handleNext = async () => {
        // --- 1. VALIDATE CHILD (Mandatory) ---
        const childMissing = getMissingFields(childForm);
        if (childMissing.length > 0) {
            alert(`⚠️ Missing Child Information:\nPlease fill:\n- ${childMissing.join('\n- ')}`);
            return;
        }

        // --- 2. VALIDATE PARENT (Conditional) ---
        // Check if user started typing parent info
        const isParentStarted = Object.values(parentForm).some(val => 
            (typeof val === 'string' && val !== '') || 
            (typeof val === 'number') || 
            (val instanceof Date) ||
            (Array.isArray(val) && val.length > 0)
        );

        if (isParentStarted) {
            const parentMissing = getMissingFields(parentForm);
            if (parentMissing.length > 0) {
                alert(`⚠️ Missing Parent Information:\nPlease complete:\n- ${parentMissing.join('\n- ')}`);
                return;
            }
        }

        // --- 3. PROCEED ---
        console.log("🚀 [UI] Sending Full Registration Data...");
        
        try {
            const result = await window.electronAPI.registerPatientPair(childForm, parentForm);
            
            if (result.success) {
                alert("✅ Registration Successful!");
                handleReset();
            } else {
                alert("❌ Failed: " + result.message);
            }
        } catch (error) {
            console.error("❌ [UI] Error calling register API:", error);
            alert("System Error during registration.");
        }
    };

    return (
        <Box p="lg" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <Title order={3} ta="center" mb="lg">Registry</Title>

            <Box p="lg" bd="1px solid #ccc" style={{ borderRadius: '8px' }}>
                <PatientInputSection title="Child" data={childForm} updateFunc={updateChild} />
                <PatientInputSection title="Parent" data={parentForm} updateFunc={updateParent} />
            </Box>

            <Group justify="center" mt="xl" gap="md">
                <Button variant="default" size="md" style={{ width: '100px' }} onClick={() => console.log("Back clicked")}>
                    Back
                </Button>
                <Button color="yellow" size="md" style={{ width: '100px' }} onClick={handleReset}>
                    Reset
                </Button>
                <Button color="blue" size="md" style={{ width: '100px' }} onClick={handleNext}>
                    Next
                </Button>
            </Group>
        </Box>
    );
}

export default Registry;