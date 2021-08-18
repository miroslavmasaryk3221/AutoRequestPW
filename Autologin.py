import pyperclip
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions
from selenium.webdriver.support.ui import WebDriverWait
import time
from configparser import ConfigParser
import os
import sys
import re
import warnings

def resource_path(relative_path: str) -> str:
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(__file__)
    return os.path.join(base_path, relative_path)

def main():

        warnings.filterwarnings("ignore")
        #opening file for reading
        f = open('.\AutologinJumpo.json')

        JumpLoginName = f.readline()  
        wiwusername = f.readline()
        wiwpassword = f.readline()
        profiledirectory = f.readline()
        masaryk = f.readline()
        f.close()
        JumpLoginName = re.sub("[^a-zA-Z0-9,-.@]+", "", JumpLoginName, flags=re.IGNORECASE)
        wiwusername = re.sub("[^a-zA-Z0-9,-.@]+", "", wiwusername, flags=re.IGNORECASE)
        wiwpassword = re.sub("[^a-zA-Z+--0-9,-.@#$%^&*()_+{}:<>?]+", "", wiwpassword, flags=re.IGNORECASE)
        masaryk = re.sub("[^a-zA-Z0-9,-.@]+", "", masaryk, flags=re.IGNORECASE)

        config = ConfigParser()
        config.read("settings.ini")
        CHROME_DRIVER_PATH = config.get("chromedriver", "path")
        print("-------- Python AutoLogin script --------")
        print("Created by Miroslav Masaryk v1.3")
        print("[Changelog]")
        print("[v1.0 11/05/2021 First working version, current problem: while entering any string auto (enter ?) is present ]")
        print("[v1.1 12/05/2021 Fixed previous error, problem was while reading file,removed unvisible chars from strings, some elements has still problems]")
        print("[v1.2 12/05/2021 All elements can be found now.")
        print("[v1.3 17/05/2021 Fixed unable to locate element while copying password. Explicit wait time raised up to 90 seconds]")
        print("      Chrome Browser set to start maximized")
        print("[v1.4 11/06/2021  Powershell script now contains option for users with prefix otis.com\ on their accounts.]")
        print("[Explicit wait time raised up to 300 seconds.]")
        print("[v1.5 16.08/2021  Version optimized for nucleus users, option to choose between chrome versions added]")

      

        

        options = webdriver.ChromeOptions()
        options.add_argument("user-data-dir=" + profiledirectory)
        options.add_experimental_option('excludeSwitches', ['enable-logging'])
        options.add_argument("start-maximized")
        driver = webdriver.Chrome(executable_path=(resource_path(CHROME_DRIVER_PATH)), options=options)
        driver.get("https://otispam.secretservercloud.com/")
        WebDriverWait(driver, 300).until(expected_conditions.presence_of_element_located((By.ID, "username")))
        driver.find_element(By.ID, "username").clear()
        driver.find_element(By.ID, "username").send_keys("" + JumpLoginName)
        driver.find_element(By.CSS_SELECTOR, ".tempSubmit").click()

        WebDriverWait(driver, 90).until(expected_conditions.presence_of_element_located((By.LINK_TEXT, masaryk))).click()

        WebDriverWait(driver, 90).until(expected_conditions.presence_of_element_located((By.ID, "enter-comment-button")))
        driver.find_element(By.ID, "enter-comment-button").click()
        driver.find_element(By.CSS_SELECTOR, ".form-control").send_keys("Standard Job")
        driver.find_element(By.ID, "new-request-continue-button").click()
        time.sleep(2)
        WebDriverWait(driver, 90).until(expected_conditions.presence_of_element_located((By.ID, "edit-secret-password-copy"))).click()
        time.sleep(2)

        s = pyperclip.paste()
        with open('lastPW.txt', 'w') as g:
                g.write(s)

        driver.get("http://otis-def2-win02.js.ts-ian.net/Citrix/StoreWeb/")
        WebDriverWait(driver, 90).until(expected_conditions.presence_of_element_located((By.ID, "username")))
        driver.find_element(By.ID, "username").send_keys("" + wiwusername)
        driver.find_element(By.ID, "password").send_keys("" + wiwpassword)
        time.sleep(2)
        driver.find_element(By.ID, "loginBtn").click()
        time.sleep(2)
        WebDriverWait(driver, 90).until(expected_conditions.presence_of_element_located((By.XPATH, "//img[@alt=\'RDP Client\']"))).click()

        time.sleep(20)
        driver.Close()


if __name__ == "__main__":
        main()
