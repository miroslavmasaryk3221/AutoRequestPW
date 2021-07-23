import pyperclip
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support.ui import WebDriverWait
import time


class TestAa():
        f = open('../AutologinJump.txt')
        f.readline()  # notice that I didn't bother to save the returned string from readline()
        f.readline()
        line = f.readline()  # this time I saved the string because I want to use it
        result = line.split()
        file.close()
        print(result)

        a_dictionary = {"a": 1, "b": 2}

        file = open("sample.txt", "w")
        file.write("%s = %s\n" % ("a_dictionary", a_dictionary))

        file.close()

        options = webdriver.ChromeOptions()
        options.add_argument("user-data-dir=profiledirectory")
        driver = webdriver.Chrome(executable_path=r'C:\Users\MIMASARY\PycharmProjects\pythonProject\drivers\chromedriver.exe', chrome_options=options)
        driver.get("https://otispam.secretservercloud.com/")
        WebDriverWait(driver, 30).until(expected_conditions.presence_of_element_located((By.ID, "username")))
        driver.find_element(By.ID, "username").clear()
        driver.find_element(By.ID, "username").send_keys("JumpLoginName")
        driver.find_element(By.CSS_SELECTOR, ".tempSubmit").click()
        WebDriverWait(driver, 60).until(expected_conditions.presence_of_element_located((By.LINK_TEXT, "masaryk-a")))
        driver.find_element(By.LINK_TEXT, "masaryk-a").click()
        WebDriverWait(driver, 30).until(expected_conditions.presence_of_element_located((By.ID, "enter-comment-button")))

        driver.find_element(By.ID, "enter-comment-button").click()
        driver.find_element(By.CSS_SELECTOR, ".form-control").send_keys("Standard Job")
        driver.find_element(By.ID, "new-request-continue-button").click()
        time.sleep(2)
        driver.find_element(By.ID, "edit-secret-password-copy").click()
        time.sleep(2)

        s = pyperclip.paste()
        with open('new.txt', 'w') as g:
                g.write(s)

        driver.get("http://otis-def2-win02.js.ts-ian.net/Citrix/StoreWeb/")
        WebDriverWait(driver, 30).until(expected_conditions.presence_of_element_located((By.ID, "username")))
        driver.find_element(By.ID, "username").send_keys("wiwusername")
        driver.find_element(By.ID, "password").send_keys("wiwpassword")
        driver.find_element(By.ID, "loginBtn").click()
        time.sleep(1)
        driver.find_element(By.CSS_SELECTOR, ".storeapp:nth-child(1) .storeapp-icon").click()

        driver.Dispose()