import React, { Component, Fragment } from 'react'
import PropTypes from 'prop-types'
import { Label, Message, Modal, Button, Popup } from 'semantic-ui-react'
import { capitalize } from 'lodash'
import { DateTime } from 'luxon'
import axios from 'axios'
import PaypalButton from './PaypalButton'
import ContentSegment from './ContentSegment'
import TestResultsTable from './TestResultsTable'

const certificationLinkConfig = {
  snitch: {
    title: 'Snitch Referee Written Test 2018-20',
    link: 'https://www.classmarker.com/online-test/start/?quiz=4q95bafa6c1b2a6a',
    color: 'yellow'
  },
  assistant: {
    title: 'Assistant Referee Written Test 2018-20',
    link: 'https://www.classmarker.com/online-test/start/?quiz=gyv5babf1bd8146f',
    color: 'blue'
  },
  head: {
    title: 'Head Referee Written Test 2018-20',
    link: 'https://www.classmarker.com/online-test/start/?quiz=tyg5baff2b2c128c',
    color: 'green'
  }
}

const oldCertificationLinkConfig = {
  snitch: {
    title: 'Snitch Referee Written Test 2016-18',
    link: 'https://www.classmarker.com/online-test/start/?quiz=crx5bb21de04a997',
    color: 'yellow'
  },
  assistant: {
    title: 'Assistant Referee Written Test 2016-18',
    link: 'https://www.classmarker.com/online-test/start/?quiz=tgr5bb21e1c149dc',
    color: 'blue'
  },
  head: {
    title: 'Head Referee Written Test 2016-18',
    link: 'https://www.classmarker.com/online-test/start/?quiz=9xb5bb21e53ea15f',
    color: 'green'
  }
}

const hasPassedTest = (level, certifications) => (
  certifications.some(({ level: certificationLevel }) => certificationLevel === level)
)

class CertificationContent extends Component {
  static propTypes = {
    refereeId: PropTypes.string.isRequired,
    isEditable: PropTypes.bool.isRequired,
    hasPaid: PropTypes.bool.isRequired,
    shouldTakeOldTests: PropTypes.bool.isRequired,
    refCertifications: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        level: PropTypes.string
      })
    ).isRequired,
    onSuccess: PropTypes.func.isRequired,
    onError: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    testResults: PropTypes.arrayOf(PropTypes.shape({
      duration: PropTypes.string,
      minimumPassPercentage: PropTypes.number,
      passed: PropTypes.bool,
      percentage: PropTypes.number,
      pointsAvailable: PropTypes.number,
      pointsScored: PropTypes.number,
      timeFinished: PropTypes.string,
      timeStarted: PropTypes.string,
      testLevel: PropTypes.string
    })).isRequired,
    testAttempts: PropTypes.arrayOf(
      PropTypes.shape({
        next_attempt_at: PropTypes.string,
        test_level: PropTypes.string
      })
    ).isRequired
  }

  state = {
    levelsThatNeedRenewal: [],
    refCertificationDetails: [],
    renewConfirmOpen: false,
    levelToRenew: ''
  }

  componentDidMount() {
    const { isEditable } = this.props

    if (isEditable) {
      axios.get('/api/v1/referee_certifications')
        .then(({ data }) => {
          const refCertificationDetails = []
          const renewalLevels = []
          data.data.forEach((refCertification) => {
            const { needs_renewal_at, level } = refCertification.attributes
            const refCertDetailData = { level, id: refCertification.id }

            refCertificationDetails.push(refCertDetailData)
            if (needs_renewal_at) { renewalLevels.push(refCertDetailData) }
          })

          this.setState({ levelsThatNeedRenewal: renewalLevels, refCertificationDetails })
        })
    }
  }

  get hasSnitchCert() {
    const { refCertifications } = this.props

    return hasPassedTest('snitch', refCertifications)
  }

  get hasAssistantCert() {
    const { refCertifications } = this.props

    return hasPassedTest('assistant', refCertifications)
  }

  get hasHeadCert() {
    const { refCertifications } = this.props

    return hasPassedTest('head', refCertifications)
  }

  handleRenewalConfirm = () => {
    const { refCertificationDetails, levelToRenew } = this.state
    const certToRenewDetails = refCertificationDetails.find(refCert => refCert.level === levelToRenew)
    // debugger
    if (!certToRenewDetails) return null

    const { id } = certToRenewDetails

    axios
      .patch(`/api/v1/referee_certifications/${id}`, {
        needs_renewal_at: DateTime.local().toString()
      })
      .then(({ data }) => {
        const updatedCertification = data.data
        const { level } = updatedCertification.attributes

        this.setState((prevState) => {
          const levelsThatNeedRenewal = prevState.levelsThatNeedRenewal.push({level, id: updatedCertification.id })
          return levelsThatNeedRenewal
        })
      })
      .then(this.handleRenewalConfirmClose)
  }

  handleRenewalConfirmOpen = (level) => { this.setState({ renewConfirmOpen: true, levelToRenew: level }) }

  handleRenewalConfirmClose = () => this.setState({ renewConfirmOpen: false, levelToRenew: '' })

  certificationLink = (shouldTakeOldTests, certificationLevel) => {
    const { refereeId } = this.props
    const { levelsThatNeedRenewal } = this.state

    const needsRenewal = !!levelsThatNeedRenewal.find(({ level }) => level === certificationLevel)
    const certificationConfig = shouldTakeOldTests && !needsRenewal
      ? oldCertificationLinkConfig
      : certificationLinkConfig

    const { link, color, title } = certificationConfig[certificationLevel]
    const fullLink = `${link}&cm_user_id=${refereeId}`

    return (
      <Label
        color={color}
        size="big"
        as="a"
        href={fullLink}
        target="_blank"
        rel="noopener noreferrer"
        content={title}
      />
    )
  }

  isInCoolDownPeriod = (certType) => {
    const { testAttempts } = this.props
    const matchingTestAttempt = testAttempts.filter(testAttempt => testAttempt.test_level === certType)

    if (matchingTestAttempt.length > 0) {
      const rawAttemptString = matchingTestAttempt[0].next_attempt_at.slice(0, -3).trim()
      const nextAttemptAt = DateTime.fromSQL(rawAttemptString)
      const currentTime = DateTime.local()

      return !(nextAttemptAt < currentTime)
    }

    return false
  }

  renderPaypalButton = () => {
    const {
      onSuccess,
      onError,
      onCancel,
      isEditable,
      hasPaid
    } = this.props
    if (!isEditable) return null
    if (!this.hasAssistantCert) return null
    if (!this.hasSnitchCert) return null
    if (hasPaid) return null

    const headerContent = 'Purchase Head Referee Written Test'
    const segmentContent = <PaypalButton onSuccess={onSuccess} onError={onError} onCancel={onCancel} />

    return <ContentSegment headerContent={headerContent} segmentContent={segmentContent} />
  }

  renderCertification = ({ level }) => {
    const { levelsThatNeedRenewal } = this.state
    if (levelsThatNeedRenewal.find(refCert => level === refCert.level)) return null

    const labelContent = `${capitalize(level)} Referee`
    const label = (
      <Label
        style={{ cursor: 'pointer' }}
        content={labelContent}
        size="big"
        key={level}
        color="green"
        onClick={() => this.handleRenewalConfirmOpen(level)}
      />
    )

    return <Popup content="Click to renew this certification" trigger={label} />
  }

  canTakeSnitchTest = () => {
    const { levelsThatNeedRenewal } = this.state
    if (this.isInCoolDownPeriod('snitch')) return false
    if (levelsThatNeedRenewal.find(refCert => refCert.level === 'snitch')) return true

    return !this.hasSnitchCert && !this.hasHeadCert
  }

  canTakeAssistantTest = () => {
    const { levelsThatNeedRenewal } = this.state
    if (this.isInCoolDownPeriod('assistant')) return false
    if (levelsThatNeedRenewal.find(refCert => refCert.level === 'assistant')) return true

    return !this.hasAssistantCert && !this.hasHeadCert
  }

  canTakeHeadTest = (hasPaid) => {
    const { levelsThatNeedRenewal } = this.state
    if (!hasPaid) return false
    if (this.isInCoolDownPeriod('head')) return false
    if (levelsThatNeedRenewal.find(refCert => refCert.level === 'head')) return true

    return this.hasSnitchCert && this.hasAssistantCert
  }

  renderCertificationLinks = () => {
    const { isEditable, hasPaid, shouldTakeOldTests } = this.props
    if (!isEditable || this.hasHeadCert) return null
    const canTakeSnitch = this.canTakeSnitchTest()
    const canTakeAssistant = this.canTakeAssistantTest()
    const canTakeHead = this.canTakeHeadTest(hasPaid)

    const anyTestsAvailable = [canTakeSnitch, canTakeAssistant, canTakeHead].some(testStatus => testStatus)

    const headerContent = 'Available Written Tests'
    const segmentContent = anyTestsAvailable
      ? (
        <Fragment>
          {canTakeSnitch && this.certificationLink(shouldTakeOldTests, 'snitch')}
          {canTakeAssistant && this.certificationLink(shouldTakeOldTests, 'assistant')}
          {canTakeHead && this.certificationLink(shouldTakeOldTests, 'head')}
          <Message info>
            Please note that you have to wait 24 hours after a failed test to be allowed to retry (72 hours for the head
            referee test), even if the link is still visible. Every passed and failed test attempt will be recorded,
            even if the testing tool fails to properly report the attempt back to us on time. In rare cases this may
            take up to 72 hours. Our apologies if this happens.
          </Message>
        </Fragment>
      )
      : (
        <p>
          One or more tests are unavailable at the moment, please check back after the 24 hour
          (for Snitch and Assistant) or 72 hour (for Head) cool down period.
        </p>
      )

    return <ContentSegment segmentContent={segmentContent} headerContent={headerContent} />
  }

  renderCompletedCertifications = () => {
    const { refCertifications } = this.props

    const headerContent = 'Completed Certifications'
    let segmentContent

    if (refCertifications.length > 0) {
      segmentContent = refCertifications.map(this.renderCertification)
    } else {
      segmentContent = 'This referee has not finished any certifications'
    }

    return <ContentSegment headerContent={headerContent} segmentContent={segmentContent} />
  }

  renderTestResults = () => {
    const { testResults, isEditable } = this.props
    if (!isEditable) return null
    if (testResults.length < 1) return null

    const headerContent = 'Test Result Details'
    const segmentContent = <TestResultsTable testResults={testResults} />

    return (
      <Fragment>
        <ContentSegment headerContent={headerContent} segmentContent={segmentContent} />
      </Fragment>
    )
  }

  renderRenewalModal = () => {
    const { renewConfirmOpen, levelToRenew } = this.state
    return (
      <Modal open={renewConfirmOpen} size="small">
        <Modal.Header>{`Confirm ${capitalize(levelToRenew)} Renewal`}</Modal.Header>
        <Modal.Content>
          <p>Are you sure you would like to renew your certification?</p>

          <p>Clicking renew will invalidate your current certification.</p>
        </Modal.Content>
        <Modal.Actions>
          <Button color="blue" onClick={this.handleRenewalConfirmClose} content="Cancel" />
          <Button color="red" onClick={this.handleRenewalConfirm} content="Renew" />
        </Modal.Actions>
      </Modal>
    )
  }

  render() {
    return (
      <Fragment>
        {this.renderPaypalButton()}
        {this.renderCertificationLinks()}
        {this.renderTestResults()}
        {this.renderCompletedCertifications()}
        {this.renderRenewalModal()}
      </Fragment>
    )
  }
}

export default CertificationContent
