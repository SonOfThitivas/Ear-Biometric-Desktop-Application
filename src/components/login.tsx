import React from 'react'
import { 
    Flex,
    Title,
    Input,
    TextInput,
    PasswordInput,
    Button,
    Alert,
    Transition,
} from '@mantine/core'
import { TbAlertCircle } from "react-icons/tb";

function Login(
    {setOperatorNumberParent}:
    {setOperatorNumberParent:React.Dispatch<React.SetStateAction<string>>}
) {
    const tbAlertCircle = <TbAlertCircle/>
    const [alertError, setAlertError] = React.useState<boolean>(false)  // alert error
    const [username, setUsername] = React.useState<string>("")  // username state
    const [password, setPassword] = React.useState<string>("")  // password state
    const [loading, setLoading] = React.useState<boolean>(false) // loading icon when click
    const [usernameError, setUsernameError] = React.useState<string>("")    // username was not filled
    const [passwordError, setPasswordError] = React.useState<string>("")    // password was not filled
    const [operatorNumber, setOperatorNumber] = React.useState<string>("") // operator number
    const [success, setSuccess] = React.useState<boolean>(false)    // when get login and get operator number
    
    React.useEffect(()=>{
        if (username !== "") setUsernameError("")   // username was filled, remove error
        if (password !== "") setPasswordError("")   // password was filled, remove error
        if (success) {
            // get operator number
            setOperatorNumberParent(operatorNumber)
            setLoading(false)
        }
        else {
            setLoading(false)
        }
    }, [username, password, operatorNumber, success, loading])

    // handle transition and alert
    const handleTransition = () => {
        const timeout = setTimeout(()=>{
            setAlertError(false)
            clearTimeout(timeout)
        }, 5000)
        return 0
    }

    // handle when click confirm button
    const handleConfirm = async () => {
        setLoading(true)

        if (username === "" || password === ""){
            // username or password were not filled
            if (username === "") setUsernameError("Please, enter your username")
            if (password === "") setPasswordError("Please, enter your password")
            setAlertError(true)
        }
        else
        {
            // query
            const res = await fetchData(username, password) 
        }
    }

    // TODO: get operator number
    const fetchData = async (username: string, pass: string) => {
        try {
            console.log("🚀 [UI] Sending login request...");
            
            // Call Electron Main Process
            // Note: Make sure loginOperator is exposed in preload.ts
            const result = await window.electronAPI.loginOperator(username, pass);

            if (result.success) {
                console.log("✅ [UI] Login Success! Operator:", result.op_number);
                setOperatorNumber(result.op_number); // Store OP Number
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
                bdrs={"xl"}
                justify={"center"}
                align={"center"}
                direction={"column"}
                p={"md"}
            >
                <Title order={1} m={"md"}>Login</Title>

                <Input.Wrapper>
                    <TextInput
                        label="Username"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(event)=>setUsername(event.currentTarget.value)}
                        error={usernameError}
                        size={"xl"}
                        m={"md"}
                    />
                    <PasswordInput
                        label="Password"
                        placeholder="Enter your password"
                        value={password}
                        onChange={(event)=>setPassword(event.currentTarget.value)}
                        error={passwordError}
                        size={"xl"}
                        m={"md"}
                    />
                </Input.Wrapper>

                <Button 
                    variant='filled' 
                    color='green'
                    size='lg'
                    w={"100%"} 
                    m="xl"
                    onClick={handleConfirm}
                    loading={loading}
                    loaderProps={{type:"oval"}}
                >
                    Confirm
                </Button>
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