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
import axios from 'axios';

// Base URL for the Python API
const API_URL = import.meta.env.VITE_PYTHON_DATABASE_API_URL || 'http://localhost:8000';

function Login(
    {setOperatorNumberParent, setRoleParent}: // <--- ADDED setRoleParent
    {
        setOperatorNumberParent:React.Dispatch<React.SetStateAction<string>>,
        setRoleParent:React.Dispatch<React.SetStateAction<string>> // <--- ADDED TYPE
    }
) {
    const [loading, setLoading] = React.useState<boolean>(false) // loading icon when click
    const [operatorNumber, setOperatorNumber] = React.useState<string>("") // operator number
    const [role, setRole] = React.useState<string>("") // <--- ADDED ROLE STATE
    const [success, setSuccess] = React.useState<boolean>(false)    // when get login and get operator number

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
                    const response = await axios.get(`${API_URL}/connect`);
                    const res = response.data;
                    
                    if (res.success) {
                        setIsConnect(true)
                        setDbError(false)
                        setLoading(false)
                        console.log("✅ [DB] Connection successful", res.message);
                
                    } else {
                        setIsConnect(false)
                        setDbError(true)
                        setLoading(false)
                        setCooldown(15) // Set 15 seconds cooldown
                        console.warn("❌ [DB] Connection failed, retrying in 15 seconds...", res.message);
                    }

                } catch (error: any) {
                    setIsConnect(false)
                    setDbError(true)
                    setLoading(false)
                    setCooldown(15)
                    console.error("❌ [DB] Connection error:", error);
                }
            }

            connectDB() // Call the async function
        }
    }, [cooldown, isConnect])

    // Cooldown timer
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
            // get operator number
            setOperatorNumberParent(operatorNumber)
            setRoleParent(role) // <--- SEND ROLE TO PARENT
            startCamera();
        } 

    }, [operatorNumber, role, success, setOperatorNumberParent, setRoleParent]) // Added deps

    // handle when click confirm button
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

    // TODO: get operator number
    const fetchData = async (username: string, pass: string) => {
        try {
            console.log("🚀 [UI] Sending login request...");
            
            // Call Python REST API
            const response = await axios.post(`${API_URL}/auth/login`, {
                username: username,
                password: pass
            });
            const result = response.data;

            if (result.success) {
                console.log("✅ [UI] Login Success! Operator:", result.op_number);
                setOperatorNumber(result.op_number); // Store OP Number
                setRole(result.role); // <--- STORE ROLE
                setSuccess(true); // Triggers useEffect to finish loading
                return 0;
            } else {
                console.warn("❌ [UI] Login Failed:", result.message);
                // Trigger the error alert
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
                message: err.response?.data?.detail || err.message,
                color:"red",
                bg: "red.1",
                autoClose:4000,
                withBorder: true,
                withCloseButton: true,
            })
            return 1;
        }
    }

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
                            // value={username}
                            // onChange={(event)=>setUsername(event.currentTarget.value)}
                            // error={usernameError}
                            size={"xl"}
                            m={"md"}
                            key={form.key("username")}
                            {...form.getInputProps('username')}
                        />
                        <PasswordInput
                            label="Password"
                            placeholder="Enter your password"
                            // value={password}
                            // onChange={(event)=>setPassword(event.currentTarget.value)}
                            // error={passwordError}
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

            {/* alert when error */}
            <Notifications/>
        </Flex>
    )
}

export default Login