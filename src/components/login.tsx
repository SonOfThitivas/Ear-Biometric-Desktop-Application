import React from 'react'
import { 
    Flex,
    Title,
    Input,
    TextInput,
    PasswordInput,
    Button,
    Group,
    LoadingOverlay,
} from '@mantine/core'
import { useForm } from '@mantine/form';
import { AiOutlineEnter } from "react-icons/ai";
import useCameraSocket from "../hooks/useCameraSocket";
import { notifications, Notifications } from '@mantine/notifications';

// 1. IMPORT THE NEW API
import { webAPI } from '../web-api'; 

function Login(
    {setOperatorNumberParent, setRoleParent}: 
    {
        setOperatorNumberParent:React.Dispatch<React.SetStateAction<string>>,
        setRoleParent:React.Dispatch<React.SetStateAction<string>> 
    }
) {
    const [loading, setLoading] = React.useState<boolean>(false) 
    const [operatorNumber, setOperatorNumber] = React.useState<string>("") 
    const [role, setRole] = React.useState<string>("") 
    const [success, setSuccess] = React.useState<boolean>(false)    

    const [isConnect, setIsConnect] = React.useState<boolean>(false)
    const [cooldown, setCooldown] = React.useState<number>(0)
    const [dbError, setDbError] = React.useState<boolean>(false)
    
    const { startCamera } = useCameraSocket();

    const form = useForm({
        mode: 'uncontrolled',
        initialValues: {
            username: "",
            password: "",
        },

        validate: {
            username: (value) => value.length === 0 ? "Username was not filled" : null,
            password: (value) => value.length === 0 ? "Password was not filled" : null,
        },
    });

    // Try to connect to database
    React.useEffect(() => {
        if (cooldown < 0 && !isConnect) {
            
            setLoading(true)
            notifications.clean()

            const connectDB = async () => {
                try {
                    // 2. CHANGE: Use webAPI instead of window.electronAPI
                    const res = await webAPI.connectDB(); 
                    
                    // Note: webAPI.connectDB returns null on fetch failure, or the object on success
                    if (res && res.success) {
                        setIsConnect(true)
                        setDbError(false)
                        setLoading(false)
                        console.log("✅ [DB] Connection successful", res.message);
                
                    } else {
                        // Handle null or success:false
                        setIsConnect(false)
                        setDbError(true)
                        setLoading(false)
                        setCooldown(15) 
                        console.warn("❌ [DB] Connection failed, retrying in 15 seconds...", res?.message);
                    }

                } catch (error: any) {
                    setIsConnect(false)
                    setDbError(true)
                    setLoading(false)
                    setCooldown(15)
                    console.error("❌ [DB] Connection error:", error);
                }
            }

            connectDB() 
        }
    }, [cooldown, isConnect])

    // Cooldown timer (No changes needed here)
    React.useEffect(() => {
        if (cooldown >= 0) {
            if (cooldown === 15){
                notifications.show({
                    id: "db-cooldown",
                    loading: true,
                    title: "Retrying...",
                    message: `Retrying to connect database in ${cooldown} seconds`,
                    autoClose: false,
                    bg: "yellow.1",
                    withBorder: true,
                })
            }
            setLoading(true)
                notifications.update({
                    id: "db-cooldown",
                    loading: true,
                    title: "Retrying...",
                    message: `Retrying to connect database in ${cooldown} seconds`,
                    withCloseButton: false,
                })
            const timer = setInterval(() => {
                setCooldown(prev => prev - 1)
            }, 1000)

            return () => clearInterval(timer)
        }
        
    }, [cooldown])
    
    React.useEffect(()=>{
        if (success) {
            setOperatorNumberParent(operatorNumber)
            setRoleParent(role) 
            startCamera();
        } 
    }, [operatorNumber, role, success, setOperatorNumberParent, setRoleParent]) 

    const handleConfirm = async (values:{username:string, password:string}) => {

        if (!isConnect) {
            notifications.show({
                id: "login-error-id",
                title:"Error!",
                message: "Database is not connected",
                color:"red",
                bg: "red.1",
                autoClose:4000,
                withBorder: true,
                withCloseButton: true,
            })
            return
        }

        setLoading(true)

        const username = values.username
        const password = values.password

        const res = await fetchData(username, password) 

        setLoading(false)
    }

    const fetchData = async (username: string, pass: string) => {
        try {
            console.log("🚀 [UI] Sending login request...");
            
            // 3. CHANGE: Use webAPI instead of window.electronAPI
            const result = await webAPI.loginOperator(username, pass);

            if (result.success) {
                console.log("✅ [UI] Login Success! Operator:", result.op_number);
                setOperatorNumber(result.op_number); 
                setRole(result.role); 
                setSuccess(true); 
                return 0;
            } else {
                console.warn("❌ [UI] Login Failed:", result.message);
                setSuccess(false);
                throw Error('Login Failed: ' + result.message)
            }

        } catch (err: any) {
            console.error("❌ [UI] Error:", err.message);
            setSuccess(false)
            setLoading(false)
            notifications.show({
                id: "login-error-id",
                title:"Error!",
                message: err.message,
                color:"red",
                bg: "red.1",
                autoClose:4000,
                withBorder: true,
                withCloseButton: true,
            })
            return 1;
        }
    }

    // JSX remains exactly the same
    return (
        <Flex 
            w={"100vw"}
            h={"100vh"}
            justify={"center"}
            align={"center"}
        >
            <Flex 
                bd={"0.2rem black solid"}
                bdrs={"lg"}
                justify={"center"}
                align={"center"}
                direction={"column"}
                p={"md"}
                pos={"relative"}
                bg={"cyan.1"}
            >
                <LoadingOverlay  visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} bdrs={"xl"}/>
                <Title order={1} m={"md"}>Login</Title>

                <form onSubmit={form.onSubmit((values) => handleConfirm(values))}>
                    <Input.Wrapper>
                        <TextInput
                            label="Username"
                            placeholder="Enter your username"
                            size={"xl"}
                            m={"md"}
                            key={form.key("username")}
                            {...form.getInputProps('username')}
                        />
                        <PasswordInput
                            label="Password"
                            placeholder="Enter your password"
                            size={"xl"}
                            m={"md"}
                            key={form.key("password")}
                            {...form.getInputProps('password')}
                        />
                    </Input.Wrapper>
                    <Group>

                        <Button 
                            type='submit'
                            variant='filled' 
                            color='green'
                            size='lg'
                            w={"100%"} 
                            m="xl"
                            loading={loading}
                            loaderProps={{type:"oval"}
                        }
                        >   
                            <Group>
                                <Title order={4}>Confirm</Title>
                                <AiOutlineEnter />
                            </Group>
                        </Button>
                    </Group>
                </form>

            </Flex>

            <Notifications/>
        </Flex>
    )
}

export default Login