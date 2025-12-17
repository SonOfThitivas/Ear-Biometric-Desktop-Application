import React from 'react'
import { 
    Box,
    Flex,
    Title,
    Input,
    TextInput,
    PasswordInput,
    Button,
    Alert,
    Transition,
    Group,
    LoadingOverlay,
} from '@mantine/core'
import { TbAlertCircle } from "react-icons/tb";
import { useForm } from '@mantine/form';
import { AiOutlineEnter } from "react-icons/ai";

function Login(
    {setOperatorNumberParent, setRoleParent}: // <--- ADDED setRoleParent
    {
        setOperatorNumberParent:React.Dispatch<React.SetStateAction<string>>,
        setRoleParent:React.Dispatch<React.SetStateAction<string>> // <--- ADDED TYPE
    }
) {
    const tbAlertCircle = <TbAlertCircle/>
    const [alertError, setAlertError] = React.useState<boolean>(false)  // alert error
    const [loading, setLoading] = React.useState<boolean>(false) // loading icon when click
    const [operatorNumber, setOperatorNumber] = React.useState<string>("") // operator number
    const [role, setRole] = React.useState<string>("") // <--- ADDED ROLE STATE
    const [success, setSuccess] = React.useState<boolean>(false)    // when get login and get operator number
    
    // React.useEffect(()=>{
    //     if (visible === true) toggle()
    // }, [visible])

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
    
    React.useEffect(()=>{
        if (success) {
            // get operator number
            setOperatorNumberParent(operatorNumber)
            setRoleParent(role) // <--- SEND ROLE TO PARENT
        } 

    }, [operatorNumber, role, success, setOperatorNumberParent, setRoleParent]) // Added deps

    // handle transition and alert
    const handleTransition = () => {
        const timeout = setTimeout(()=>{
            setAlertError(false)
            clearTimeout(timeout)
        }, 5000)
        return 0
    }

    // handle when click confirm button
    const handleConfirm = async (values:{username:string, password:string}) => {
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
            
            // Call Electron Main Process
            const result = await window.electronAPI.loginOperator(username, pass);

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
                setAlertError(true);
                return 1;
            }

        } catch (err) {
            console.error("❌ [UI] Error:", err);
            setSuccess(false);
            setAlertError(true);
            setLoading(false)
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
            <LoadingOverlay  visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }}/>
            <Flex 
                bd={"0.2rem black solid"}
                bdrs={"xl"}
                justify={"center"}
                align={"center"}
                direction={"column"}
                p={"md"}
            >
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
            <Transition
                mounted={alertError}
                transition="fade-left"
                duration={400}
                timingFunction="ease"
                keepMounted
                onEntered={handleTransition}
            >
                {(styles) => 
                <Alert
                    pos={"fixed"}
                    w={"25%"}
                    right={"1rem"}
                    bottom={"1rem"}
                    variant="filled" 
                    color="red" 
                    title="Error"
                    icon={tbAlertCircle}
                    onClose={()=>setAlertError(false)}
                    withCloseButton
                    style={styles}
                >
                    Your username or password were wrong. Please, try again.
                </Alert>}
            </Transition>
        </Flex>
    )
}

export default Login