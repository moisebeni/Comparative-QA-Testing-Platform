/// <reference types="Cypress" />
const userListPath = 'cypress/fixtures/credentials.json'

export class LoginPage {

    visit() {
        cy.visit('https://main.ooti.co/account/login')
    }

    getUsernameField() {
        return cy.get('input[name="email"], input[type="email"]').filter(':visible').first()
    }

    getPasswordField() {
        return cy.get('input[name="password"], input[type="password"]').filter(':visible').first()
    }

    getUsernameFieldFromModal() {
        return cy.get('.modal-content [placeholder="Username"]')
    }

    getPasswordFieldFromModal() {
        return cy.get('.modal-content [placeholder="Password"]')
    }

    getLoginButton() {
        return cy
            .get('button[type="submit"], button[data-testid*="LoadingButton"]')
            .filter(':visible')
            .first()
    }

// === Login function === 
auth(account) {
    cy.readFile(userListPath).then(credentials => {
        const selectedAccount = credentials[account]

        if (!selectedAccount) {
            throw new Error(`Account "${account}" not found in ${userListPath}`)
        }

        const { email, password } = selectedAccount;
        cy.wait(2000)
        const submitLogin = () => {
            this.getUsernameField().clear().type(email)
            this.getPasswordField().clear().type(password)
            this.getLoginButton().first().click({ force: true })
        }

        submitLogin()
        cy.location("pathname", { timeout: 20000 }).then((pathname) => {
            if (!pathname.includes("/account/login")) {
                return
            }

            cy.reload()
            submitLogin()
            cy.location("pathname", { timeout: 20000 }).should("not.include", "/account/login")
        })
    })
}

    changeLanguageToFrench(){
        this.dismissOnboardingOverlay()
        cy.get('.MuiAvatar-img', { timeout: 10000 }).click({ force: true })
        cy.contains("Français").click({ force: true })
    }

    dismissOnboardingOverlay() {
        const academyText = "Découvrez votre nouvel espace l’OOTI Academy"
        const tooltipSelector = '.react-joyride__tooltip:visible'
        const primaryCloseSelector = 'button[data-testid="button-primary"][aria-label="Fermer"], button[data-testid="button-primary"][title="Fermer"]'
        const iconCloseSelector = 'button[data-testid="button-close"][aria-label="Fermer"], button[data-testid="button-close"][title="Fermer"]'

        cy.get("body").then(($body) => {
            if (!$body.text().includes(academyText)) {
                return
            }

            cy.contains(tooltipSelector, academyText, { timeout: 10000 })
                .should("be.visible")
                .within(() => {
                    cy.root().then(($tooltip) => {
                        if ($tooltip.find(primaryCloseSelector).length) {
                            cy.get(primaryCloseSelector).first().click({ force: true })
                            return
                        }

                        cy.get(iconCloseSelector).first().click({ force: true })
                    })
                })

            cy.contains(tooltipSelector, academyText, { timeout: 10000 }).should("not.exist")
        })
    }

}
export const loginPage = new LoginPage();
